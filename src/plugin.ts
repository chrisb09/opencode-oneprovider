import type { Plugin } from "@opencode-ai/plugin";
import {
  ONEPROVIDER_PROVIDER_ID,
  ONEPROVIDER_DEFAULT_NAME,
  ONEPROVIDER_DEFAULT_BASE_URL,
  ONEPROVIDER_DEFAULT_NPM,
  ONEPROVIDER_ANTHROPIC_NPM,
} from "./constants";
import { ONEPROVIDER_DEFAULT_MODELS } from "./models";

const MAX_RETRY_ATTEMPTS = 3;
const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504, 529]);

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

  // Exponential backoff with jitter prevents synchronized retries after an outage.
  return Math.min(1_000 * 2 ** attempt + Math.floor(Math.random() * 250), 10_000);
}

function isRetryable(response: Response): boolean {
  return RETRYABLE_STATUS_CODES.has(response.status);
}

async function sleep(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export const plugin: Plugin = async ({ client, directory }) => {
  return {
    auth: {
      provider: ONEPROVIDER_PROVIDER_ID,
      loader: async (getAuth, provider) => {
        const auth = await getAuth();
        const providerRecord = provider as unknown as Record<string, unknown> | undefined;
        const providerOptions = providerRecord?.options as Record<string, unknown> | undefined;
        const apiKey =
          (auth && "key" in auth && typeof auth.key === "string" ? auth.key : "") ||
          process.env.ONEPROVIDER_API_KEY ||
          (providerOptions?.apiKey as string | undefined) ||
          "";

        const baseURL =
          process.env.ONEPROVIDER_BASE_URL ||
          (providerOptions?.baseURL as string | undefined) ||
          ONEPROVIDER_DEFAULT_BASE_URL;
        const baseOrigin = new URL(baseURL).origin;

        return {
          apiKey,
          async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
            // Only OneProvider requests are retried. Other provider traffic must retain
            // its native behavior, even when it happens to use the same AI SDK process.
            if (new URL(requestUrl(input)).origin !== baseOrigin) return fetch(input, init);

            const headers = new Headers(init?.headers);
            if (apiKey) {
              if (!headers.has("x-api-key")) {
                headers.set("x-api-key", apiKey);
              }
              if (!headers.has("authorization")) {
                headers.set("authorization", `Bearer ${apiKey}`);
              }
            }

            const requestInit: RequestInit = {
              ...init,
              headers,
            };

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
          },
        };
      },
      methods: [
        {
          label: "OneProvider API key",
          type: "api",
          prompts: [
            {
              type: "text",
              key: "key",
              message: "OneProvider API key (sk-...)",
              placeholder: "sk-...",
              validate: (val: string) =>
                val && val.trim().startsWith("sk-")
                  ? undefined
                  : "Please enter a valid OneProvider API key starting with sk-",
            },
          ],
          authorize: async (inputs?: Record<string, string>) => {
            const key = inputs?.["key"]?.trim() || "";
            if (!key) {
              return { type: "failed" };
            }

            try {
              await client.tui.showToast({
                body: {
                  title: "OneProvider Login",
                  message: "Successfully authenticated with OneProvider",
                  variant: "success",
                },
              });
            } catch {
              // TUI might be unavailable in non-interactive sessions
            }

            return {
              type: "success",
              key,
              provider: ONEPROVIDER_PROVIDER_ID,
            };
          },
        },
      ],
    },
    config: async (cfg) => {
      cfg.provider = cfg.provider || {};
      const existing = (cfg.provider[ONEPROVIDER_PROVIDER_ID] || {}) as Record<string, any>;
      const existingOptions = (existing.options || {}) as Record<string, any>;
      const existingModels = (existing.models || {}) as Record<string, any>;

      const resolvedApiKey =
        process.env.ONEPROVIDER_API_KEY ||
        existingOptions.apiKey ||
        undefined;

      const mergedModels: Record<string, any> = {
        ...ONEPROVIDER_DEFAULT_MODELS,
        ...existingModels,
      };

      for (const [id, model] of Object.entries(mergedModels)) {
        const lower = id.toLowerCase();
        if (
          (lower.startsWith("claude-") || lower.includes("anthropic")) &&
          (!model.provider || !model.provider.npm)
        ) {
          mergedModels[id] = {
            ...model,
            provider: {
              ...(model.provider || {}),
              npm: ONEPROVIDER_ANTHROPIC_NPM,
            },
          };
        }
      }

      cfg.provider[ONEPROVIDER_PROVIDER_ID] = {
        name: existing.name || ONEPROVIDER_DEFAULT_NAME,
        npm: existing.npm || ONEPROVIDER_DEFAULT_NPM,
        ...existing,
        options: {
          baseURL:
            process.env.ONEPROVIDER_BASE_URL ||
            existingOptions.baseURL ||
            ONEPROVIDER_DEFAULT_BASE_URL,
          ...(resolvedApiKey ? { apiKey: resolvedApiKey } : {}),
          ...existingOptions,
        },
        models: mergedModels,
      };
    },
  };
};

export default plugin;
