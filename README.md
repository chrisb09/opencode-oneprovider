# opencode-oneprovider

OpenCode plugin for [OneProvider](https://oneprovider.dev) — unified access to Claude, DeepSeek, GLM, GPT and more with pre-configured models, token pricing, context limits, and authentication.

---

## Features

- **Zero Boilerplate**: Injects `oneprovider` provider configuration into OpenCode automatically. No need to maintain huge model blocks in your `opencode.jsonc`.
- **Accurate Token Pricing**: All models are pre-configured with exact input, output, cache-read, and cache-write rates based on the [OneProvider pricing table](https://oneprovider.dev/pricing#model-rates).
- **Accurate Context Windows**: Models are configured with true context limits (up to 1M+ tokens) and appropriate output ceilings.
- **Secure Key Management**:
  - `opencode auth login` (stored in OpenCode's secure auth store)
  - `ONEPROVIDER_API_KEY` environment variable
  - Optional `provider.oneprovider.options.apiKey` override

---

## Installation

Add this plugin to your `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "opencode-oneprovider"
  ]
}
```

Or for local development / git clone:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "/home/christian/git/opencode-oneprovider"
  ]
}
```

---

## Authentication

You can authenticate in any of the following ways:

### 1. Interactive Login (Recommended)

Run:

```bash
opencode auth login
```

Select **OneProvider API key** and enter your `sk-...` API key.

### 2. Environment Variable

Export `ONEPROVIDER_API_KEY`:

```bash
export ONEPROVIDER_API_KEY="sk-..."
```

### 3. Config File (Optional)

If you prefer keeping your key in `opencode.jsonc`:

```jsonc
{
  "provider": {
    "oneprovider": {
      "options": {
        "apiKey": "sk-..."
      }
    }
  }
}
```

---

## Supported Models

### Core Default Lineup

| Model ID | Name | Context | Output | Input $/1M | Output $/1M | Cache Read | Cache Write |
|---|---|---|---|---|---|---|---|
| `oneprovider/claude-fable-5-1` | Claude Fable 5.1 | 1,048,576 | 65,536 | $10.00 | $50.00 | $0.25 | $12.50 |
| `oneprovider/claude-opus-5-5` | Claude Opus 5.5 | 1,000,000 | 128,000 | $4.00 | $20.00 | $0.20 | $5.00 |
| `oneprovider/claude-sonnet-5-5` | Claude Sonnet 5.5 | 1,000,000 | 65,536 | $1.00 | $5.00 | $0.10 | $1.25 |
| `oneprovider/claude-haiku-4-5` | Claude Haiku 4.5 | 204,800 | 8,192 | $1.00 | $5.00 | $0.10 | $1.25 |
| `oneprovider/deepseek-v4-pro` | DeepSeek V4 Pro | 1,048,576 | 8,192 | $0.66 | $1.98 | $0.022 | $0.66 |
| `oneprovider/deepseek-v4-flash` | DeepSeek V4 Flash | 1,048,576 | 8,192 | $0.22 | $0.66 | $0.007 | $0.22 |
| `oneprovider/glm-5.3` | GLM 5.3 | 1,048,576 | 131,072 | $1.40 | $4.40 | $0.26 | $1.40 |
| `oneprovider/glm-5.3-flash` | GLM 5.3 Flash | 1,048,576 | 131,072 | $0.15 | $0.50 | $0.03 | $0.15 |
| `oneprovider/gpt-6-luna` | GPT-6 Luna | 1,048,576 | 128,000 | $0.10 | $0.50 | $0.01 | $0.125 |
| `oneprovider/gpt-6.1-sol` | GPT-6.1 Sol | 1,048,576 | 128,000 | $2.00 | $10.00 | $0.10 | $2.00 |
| `oneprovider/gpt-5.6-terra` | GPT-5.6 Terra | 1,048,576 | 128,000 | $2.50 | $15.00 | $0.25 | $3.125 |

---

## License

MIT
