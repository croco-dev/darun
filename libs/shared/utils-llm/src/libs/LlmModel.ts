export type LlmModel = 'nvidia/nemotron-3-ultra-550b-a55b:free' | 'x-ai/grok-4-fast' | (string & {});

export const DEFAULT_LLM_MODEL: LlmModel = 'nvidia/nemotron-3-ultra-550b-a55b:free';
export const DEFAULT_LLM_ENDPOINT = 'https://openrouter.ai/api/v1';
