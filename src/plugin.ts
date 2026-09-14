import type { Plugin } from "@opencode-ai/plugin";
import {
  ONEPROVIDER_PROVIDER_ID,
  ONEPROVIDER_DEFAULT_NAME,
  ONEPROVIDER_DEFAULT_BASE_URL,
  ONEPROVIDER_DEFAULT_NPM,
} from "./constants";
import { ONEPROVIDER_DEFAULT_MODELS } from "./models";

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

        return {
          apiKey,
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
        models: {
          ...ONEPROVIDER_DEFAULT_MODELS,
          ...existingModels,
        },
      };
    },
  };
};

export default plugin;
