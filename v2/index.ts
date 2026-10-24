import { Integration, Model, Plugin, Provider } from "@opencode/plugin";
import {
  ONEPROVIDER_ANTHROPIC_NPM,
  ONEPROVIDER_DEFAULT_BASE_URL,
  ONEPROVIDER_DEFAULT_NAME,
  ONEPROVIDER_DEFAULT_NPM,
  ONEPROVIDER_PROVIDER_ID,
} from "../src/constants";
import { ONEPROVIDER_DEFAULT_MODELS } from "../src/models";
import type { ModelCost, OneProviderModelDefinition } from "../src/types";

const MAX_RETRY_ATTEMPTS = 3;
const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504, 529]);
const integrationID = Integration.ID.make(ONEPROVIDER_PROVIDER_ID);
const providerID = Provider.ID.make(ONEPROVIDER_PROVIDER_ID);

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function retryDelay(response: Response | undefined, attempt: number): number {
  const retryAfter = response?.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 30_000);

    const date = Date.parse(retryAfter);
    if (!Number.isNaN(date)) return Math.min(Math.max(date - Date.now(), 0), 30_000);
  }

  return Math.min(1_000 * 2 ** attempt + Math.floor(Math.random() * 250), 10_000);
}

function isRetryable(response: Response): boolean {
  return RETRYABLE_STATUS_CODES.has(response.status);
}

async function sleep(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function costTiers(cost: ModelCost | undefined): Model.Info["cost"] {
  if (!cost) return [];
  const base = {
    input: cost.input,
    output: cost.output,
    cache: { read: cost.cache_read ?? 0, write: cost.cache_write ?? 0 },
  };
  const tiers: unknown[] = [base];
  if (cost.context_over_200k) {
    tiers.push({
      tier: { type: "context", size: 200_000 },
      input: cost.context_over_200k.input,
      output: cost.context_over_200k.output,
      cache: {
        read: cost.context_over_200k.cache_read ?? 0,
        write: cost.context_over_200k.cache_write ?? 0,
      },
    });
  }
  return tiers as Model.Info["cost"];
}

function modelInfo(id: string, definition: OneProviderModelDefinition): Model.Info {
  const modelID = Model.ID.make(id);
  return {
    ...Model.Info.default(providerID, modelID),
    id: modelID,
    modelID,
    name: definition.name,
    package: `aisdk:${definition.provider?.npm ?? ONEPROVIDER_DEFAULT_NPM}`,
    capabilities: {
      tools: definition.tool_call !== false,
      input: definition.attachment ? ["text", "image", "pdf"] : ["text"],
      output: ["text"],
    },
    limit: {
      context: definition.limit?.context ?? 128_000,
      output: definition.limit?.output ?? 8_192,
    },
    cost: costTiers(definition.cost),
    variants: Object.entries(definition.variants ?? {}).map(([variantID, settings]) => ({
      id: Model.VariantID.make(variantID),
      settings: settings as Record<string, unknown>,
    })),
    status: "active",
    enabled: true,
    time: { released: 0 },
  } as unknown as Model.Info;
}

async function resolveApiKey(ctx: Parameters<Parameters<typeof Plugin.define>[0]["setup"]>[0]): Promise<string> {
  try {
    const connection = await ctx.integration.connection.active(integrationID);
    const credential = connection ? await ctx.integration.connection.resolve(connection) : undefined;
    if (credential?.type === "key") return credential.key;
    if (credential?.type === "oauth") return credential.access;
  } catch {
    // Fall through to the environment override.
  }
  return process.env.ONEPROVIDER_API_KEY ?? "";
}

function createProviderFetch(
  ctx: Parameters<Parameters<typeof Plugin.define>[0]["setup"]>[0],
  baseURL: string,
): typeof fetch {
  const baseOrigin = new URL(baseURL).origin;

  return async (input, init) => {
    if (new URL(requestUrl(input)).origin !== baseOrigin) return fetch(input, init);

    const apiKey = await resolveApiKey(ctx);
    const headers = new Headers(init?.headers);
    if (apiKey) {
      if (!headers.has("x-api-key")) headers.set("x-api-key", apiKey);
      if (!headers.has("authorization")) headers.set("authorization", `Bearer ${apiKey}`);
    }

    const requestInit: RequestInit = { ...init, headers };
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        const response = await fetch(input, requestInit);
        if (!isRetryable(response) || attempt === MAX_RETRY_ATTEMPTS - 1) return response;
        await sleep(retryDelay(response, attempt));
      } catch (error) {
        lastError = error;
        if (attempt === MAX_RETRY_ATTEMPTS - 1) throw error;
        await sleep(retryDelay(undefined, attempt));
      }
    }

    throw lastError;
  };
}

function sdkPackage(packageName: string): string {
  return packageName.replace(/^aisdk:/, "");
}

export default Plugin.define({
  id: "oneprovider",
  async setup(ctx) {
    await ctx.integration.transform((editor) => {
      editor.update(integrationID, (integration) => {
        integration.id = integrationID;
        integration.name = ONEPROVIDER_DEFAULT_NAME;
      });
      editor.method.update({
        integrationID,
        method: { type: "key", label: "OneProvider API key" },
      });
      editor.method.update({
        integrationID,
        method: { type: "env", names: ["ONEPROVIDER_API_KEY"] },
      });
    });

    await ctx.provider.transform((editor) => {
      const info = {
        ...Provider.Info.empty(providerID),
        name: ONEPROVIDER_DEFAULT_NAME,
        activation: "enabled",
        package: `aisdk:${ONEPROVIDER_DEFAULT_NPM}`,
        integrationID,
        settings: { baseURL: ONEPROVIDER_DEFAULT_BASE_URL },
      } as unknown as Provider.Info;
      editor.add({
        info,
        models: Object.entries(ONEPROVIDER_DEFAULT_MODELS).map(([id, definition]) =>
          modelInfo(id, definition as OneProviderModelDefinition),
        ),
      });
    });

    await ctx.aisdk.hook("sdk", async (event) => {
      const packageName = sdkPackage(event.model.package ?? event.package);
      if (packageName !== ONEPROVIDER_DEFAULT_NPM && packageName !== ONEPROVIDER_ANTHROPIC_NPM) return;
      if (event.model.providerID !== providerID) return;

      const baseURL =
        typeof event.options.baseURL === "string" ? event.options.baseURL : ONEPROVIDER_DEFAULT_BASE_URL;
      const options = {
        ...event.options,
        baseURL,
        apiKey: typeof event.options.apiKey === "string" ? event.options.apiKey : "",
        fetch: createProviderFetch(ctx, baseURL),
      };

      if (packageName === ONEPROVIDER_ANTHROPIC_NPM) {
        const { createAnthropic } = await import("@ai-sdk/anthropic");
        event.sdk = createAnthropic(options as Parameters<typeof createAnthropic>[0]);
      } else {
        const { createOpenAI } = await import("@ai-sdk/openai");
        event.sdk = createOpenAI(options as Parameters<typeof createOpenAI>[0]);
      }
    });
  },
});
