export interface ModelCost {
  input: number;
  output: number;
  cache_read?: number;
  cache_write?: number;
  context_over_200k?: {
    input: number;
    output: number;
    cache_read?: number;
    cache_write?: number;
  };
}

export interface ModelLimit {
  context: number;
  output: number;
}

export interface OneProviderModelDefinition {
  name: string;
  attachment?: boolean;
  tool_call?: boolean;
  reasoning?: boolean;
  interleaved?: boolean | string | { field: string };
  limit?: ModelLimit;
  cost?: ModelCost;
  variants?: Record<string, unknown>;
}
