import type { OneProviderModelDefinition } from "./types";

/**
 * Curated default model lineup for OneProvider.
 * Context limits, output limits, features, and rates verified against https://oneprovider.dev/pricing#model-rates.
 */
export const ONEPROVIDER_DEFAULT_MODELS: Record<string, OneProviderModelDefinition> = {
  // --- Anthropic / Claude ---
  "claude-fable-5-1": {
    name: "Claude Fable 5.1 (OneProvider)",
    attachment: true,
    tool_call: true,
    reasoning: true,
    limit: {
      context: 1_048_576,
      output: 65_536,
    },
    cost: {
      input: 10.0,
      output: 50.0,
      cache_read: 0.25,
      cache_write: 12.5,
    },
  },
  "claude-opus-5-5": {
    name: "Claude Opus 5.5 (OneProvider)",
    attachment: true,
    tool_call: true,
    reasoning: true,
    limit: {
      context: 1_000_000,
      output: 128_000,
    },
    cost: {
      input: 4.0,
      output: 20.0,
      cache_read: 0.2,
      cache_write: 5.0,
    },
  },
  "claude-sonnet-5-5": {
    name: "Claude Sonnet 5.5 (OneProvider)",
    attachment: true,
    tool_call: true,
    limit: {
      context: 1_000_000,
      output: 65_536,
    },
    cost: {
      input: 1.0,
      output: 5.0,
      cache_read: 0.1,
      cache_write: 1.25,
    },
  },
  "claude-haiku-4-5": {
    name: "Claude Haiku 4.5 (OneProvider)",
    attachment: false,
    tool_call: true,
    limit: {
      context: 204_800,
      output: 8_192,
    },
    cost: {
      input: 1.0,
      output: 5.0,
      cache_read: 0.1,
      cache_write: 1.25,
    },
  },

  // --- DeepSeek ---
  "deepseek-v4-pro": {
    name: "DeepSeek V4 Pro (OneProvider)",
    attachment: true,
    tool_call: true,
    reasoning: true,
    interleaved: "reasoning_content",
    limit: {
      context: 1_048_576,
      output: 8_192,
    },
    cost: {
      input: 0.66,
      output: 1.98,
      cache_read: 0.022,
      cache_write: 0.66,
    },
  },
  "deepseek-v4-flash": {
    name: "DeepSeek V4 Flash (OneProvider)",
    attachment: true,
    tool_call: true,
    limit: {
      context: 1_048_576,
      output: 8_192,
    },
    cost: {
      input: 0.22,
      output: 0.66,
      cache_read: 0.007,
      cache_write: 0.22,
    },
  },

  // --- Z.ai / GLM ---
  "glm-5.3": {
    name: "GLM 5.3 (OneProvider)",
    attachment: true,
    tool_call: true,
    reasoning: true,
    interleaved: "reasoning_content",
    limit: {
      context: 1_048_576,
      output: 131_072,
    },
    cost: {
      input: 1.4,
      output: 4.4,
      cache_read: 0.26,
      cache_write: 1.4,
    },
  },
  "glm-5.3-flash": {
    name: "GLM 5.3 Flash (OneProvider)",
    attachment: true,
    tool_call: true,
    limit: {
      context: 1_048_576,
      output: 131_072,
    },
    cost: {
      input: 0.15,
      output: 0.5,
      cache_read: 0.03,
      cache_write: 0.15,
    },
  },

  // --- OpenAI / GPT ---
  "gpt-6-luna": {
    name: "GPT-6 Luna (OneProvider)",
    attachment: true,
    tool_call: true,
    limit: {
      context: 1_048_576,
      output: 128_000,
    },
    cost: {
      input: 0.1,
      output: 0.5,
      cache_read: 0.01,
      cache_write: 0.125,
    },
  },
  "gpt-6.1-sol": {
    name: "GPT-6.1 Sol (OneProvider)",
    attachment: true,
    tool_call: true,
    limit: {
      context: 1_048_576,
      output: 128_000,
    },
    cost: {
      input: 2.0,
      output: 10.0,
      cache_read: 0.1,
      cache_write: 2.0,
    },
  },
  "gpt-5.6-terra": {
    name: "GPT-5.6 Terra (OneProvider)",
    attachment: true,
    tool_call: true,
    limit: {
      context: 1_048_576,
      output: 128_000,
    },
    cost: {
      input: 2.5,
      output: 15.0,
      cache_read: 0.25,
      cache_write: 3.125,
    },
  },
};

/**
 * Extended catalog of models available on OneProvider.
 * Users can reference these directly in their opencode configuration or whitelist.
 */
export const ONEPROVIDER_EXTENDED_MODELS: Record<string, OneProviderModelDefinition> = {
  ...ONEPROVIDER_DEFAULT_MODELS,

  // Additional Claude (prior generations, demoted from defaults)
  "claude-opus-5": {
    name: "Claude Opus 5 (OneProvider)",
    attachment: true,
    tool_call: true,
    reasoning: true,
    limit: { context: 1_048_576, output: 65_536 },
    cost: { input: 5.0, output: 25.0, cache_read: 0.5, cache_write: 6.25 },
  },
  "claude-sonnet-5": {
    name: "Claude Sonnet 5 (OneProvider)",
    attachment: true,
    tool_call: true,
    reasoning: true,
    limit: { context: 1_048_576, output: 65_536 },
    cost: { input: 2.0, output: 10.0, cache_read: 0.2, cache_write: 2.5 },
  },
  "claude-fable-5": {
    name: "Claude Fable 5 (OneProvider)",
    attachment: true,
    tool_call: true,
    reasoning: true,
    limit: { context: 1_048_576, output: 65_536 },
    cost: { input: 10.0, output: 50.0, cache_read: 1.0, cache_write: 12.5 },
  },
  "claude-opus-4-8": {
    name: "Claude Opus 4.8 (OneProvider)",
    attachment: true,
    tool_call: true,
    limit: { context: 1_048_576, output: 65_536 },
    cost: { input: 5.0, output: 25.0, cache_read: 0.5, cache_write: 6.25 },
  },
  "claude-opus-4-7": {
    name: "Claude Opus 4.7 (OneProvider)",
    attachment: true,
    tool_call: true,
    limit: { context: 1_048_576, output: 128_000 },
    cost: { input: 5.0, output: 25.0, cache_read: 0.5, cache_write: 6.25 },
  },
  "claude-opus-4-6": {
    name: "Claude Opus 4.6 (OneProvider)",
    attachment: true,
    tool_call: true,
    limit: { context: 1_048_576, output: 128_000 },
    cost: { input: 4.0, output: 20.0, cache_read: 0.2, cache_write: 5.0 },
  },
  "claude-sonnet-4-6": {
    name: "Claude Sonnet 4.6 (OneProvider)",
    attachment: true,
    tool_call: true,
    limit: { context: 1_048_576, output: 65_536 },
    cost: { input: 3.0, output: 15.0, cache_read: 0.3, cache_write: 3.75 },
  },

  // Additional DeepSeek
  "deepseek-v4-flash-vision-exp": {
    name: "DeepSeek V4 Flash Vision Exp (OneProvider)",
    attachment: true,
    tool_call: true,
    limit: { context: 1_048_576, output: 8_192 },
    cost: { input: 0.22, output: 0.66, cache_read: 0.007, cache_write: 0.22 },
  },

  // Google / Gemini via OneProvider
  "gemini-3.8-flash": {
    name: "Gemini 3.8 Flash (OneProvider)",
    attachment: true,
    tool_call: true,
    limit: { context: 1_050_000, output: 65_536 },
    cost: { input: 0.75, output: 3.75, cache_read: 0.075, cache_write: 0.75 },
  },
  "gemini-3.7-flash": {
    name: "Gemini 3.7 Flash (OneProvider)",
    attachment: true,
    tool_call: true,
    limit: { context: 1_050_000, output: 65_536 },
    cost: { input: 0.75, output: 3.75, cache_read: 0.075, cache_write: 0.75 },
  },
  "gemini-3.6-flash": {
    name: "Gemini 3.6 Flash (OneProvider)",
    attachment: true,
    tool_call: true,
    limit: { context: 1_050_000, output: 65_536 },
    cost: { input: 0.75, output: 3.75, cache_read: 0.075, cache_write: 0.75 },
  },
  "gemini-3.1-pro": {
    name: "Gemini 3.1 Pro (OneProvider)",
    attachment: true,
    tool_call: true,
    limit: { context: 1_050_000, output: 65_536 },
    cost: {
      input: 2.0,
      output: 12.0,
      cache_read: 0.2,
      cache_write: 2.0,
      context_over_200k: {
        input: 4.0,
        output: 18.0,
        cache_read: 0.4,
        cache_write: 4.0,
      },
    },
  },

  // Z.ai / GLM
  "glm-5.1": {
    name: "GLM 5.1 (OneProvider)",
    attachment: true,
    tool_call: true,
    limit: { context: 1_048_576, output: 8_192 },
    cost: { input: 1.4, output: 4.4, cache_read: 0.28, cache_write: 1.0 },
  },

  // Additional OpenAI / GPT (demoted from defaults or newer variants)
  "gpt-5.6-luna": {
    name: "GPT-5.6 Luna (OneProvider)",
    attachment: true,
    tool_call: true,
    limit: { context: 1_048_576, output: 128_000 },
    cost: { input: 1.0, output: 6.0, cache_read: 0.1, cache_write: 1.25 },
  },
  "gpt-6-sol": {
    name: "GPT-6 Sol (OneProvider)",
    attachment: true,
    tool_call: true,
    limit: { context: 1_048_576, output: 128_000 },
    cost: { input: 2.0, output: 10.0, cache_read: 0.2, cache_write: 2.5 },
  },
  "gpt-6-astra": {
    name: "GPT-6 Astra (OneProvider)",
    attachment: false,
    tool_call: true,
    limit: { context: 1_100_000, output: 128_000 },
    cost: {
      input: 10.0,
      output: 50.0,
      cache_read: 1.0,
      cache_write: 12.5,
      context_over_200k: {
        input: 20.0,
        output: 75.0,
        cache_read: 2.0,
        cache_write: 25.0,
      },
    },
  },
  "gpt-5.5": {
    name: "GPT-5.5 (OneProvider)",
    attachment: true,
    tool_call: true,
    limit: { context: 1_050_000, output: 128_000 },
    cost: { input: 5.0, output: 30.0, cache_read: 0.5, cache_write: 0.0 },
  },
  "gpt-5.4": {
    name: "GPT-5.4 (OneProvider)",
    attachment: true,
    tool_call: true,
    limit: { context: 1_050_000, output: 128_000 },
    cost: {
      input: 2.5,
      output: 15.0,
      cache_read: 0.25,
      cache_write: 0.0,
      context_over_200k: {
        input: 5.0,
        output: 22.5,
        cache_read: 0.5,
        cache_write: 0.0,
      },
    },
  },
  "gpt-5.4-mini": {
    name: "GPT-5.4 Mini (OneProvider)",
    attachment: true,
    tool_call: true,
    limit: { context: 1_048_576, output: 128_000 },
    cost: { input: 0.75, output: 4.5, cache_read: 0.075 },
  },

  // xAI / Grok
  "grok-4.7": {
    name: "Grok 4.7 (OneProvider)",
    attachment: false,
    tool_call: true,
    limit: { context: 500_000, output: 8_192 },
    cost: {
      input: 2.0,
      output: 6.0,
      cache_read: 0.5,
      cache_write: 0.0,
      context_over_200k: {
        input: 4.0,
        output: 12.0,
        cache_read: 1.0,
        cache_write: 0.0,
      },
    },
  },
  "grok-4.6": {
    name: "Grok 4.6 (OneProvider)",
    attachment: false,
    tool_call: true,
    limit: { context: 500_000, output: 8_192 },
    cost: {
      input: 2.0,
      output: 6.0,
      cache_read: 0.5,
      cache_write: 0.0,
      context_over_200k: {
        input: 4.0,
        output: 12.0,
        cache_read: 1.0,
        cache_write: 0.0,
      },
    },
  },
  "grok-4.3": {
    name: "Grok 4.3 (OneProvider)",
    attachment: false,
    tool_call: true,
    limit: { context: 500_000, output: 8_192 },
    cost: { input: 1.25, output: 2.5, cache_read: 0.2, cache_write: 1.25 },
  },

  // Moonshot / Kimi
  "kimi-k3": {
    name: "Kimi K3 (OneProvider)",
    attachment: true,
    tool_call: true,
    limit: { context: 1_050_000, output: 8_192 },
    cost: { input: 3.0, output: 15.0, cache_read: 0.3, cache_write: 3.0 },
  },
  "kimi-k2.7-code": {
    name: "Kimi K2.7 Code (OneProvider)",
    attachment: true,
    tool_call: true,
    limit: { context: 262_144, output: 8_192 },
    cost: { input: 0.95, output: 4.0, cache_read: 0.19, cache_write: 0.95 },
  },

  // Xiaomi / MiMo
  "mimo-v2.5-pro": {
    name: "MiMo V2.5 Pro (OneProvider)",
    attachment: true,
    tool_call: true,
    limit: { context: 1_050_000, output: 131_072 },
    cost: { input: 0.435, output: 0.87, cache_read: 0.0036, cache_write: 0.435 },
  },

  // Alibaba / Qwen
  "qwen3.8-max": {
    name: "Qwen 3.8 Max (OneProvider)",
    attachment: false,
    tool_call: true,
    limit: { context: 131_072, output: 8_192 },
    cost: { input: 1.65, output: 4.951, cache_read: 0.33, cache_write: 2.0625 },
  },
  "qwen3.8-flash": {
    name: "Qwen 3.8 Flash (OneProvider)",
    attachment: false,
    tool_call: true,
    limit: { context: 131_072, output: 8_192 },
    cost: { input: 0.15, output: 0.47, cache_read: 0.03, cache_write: 0.1875 },
  },
};
