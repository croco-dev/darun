export type LlmModel = 'nvidia/nemotron-3-super-120b-a12b:free' | 'x-ai/grok-4-fast' | (string & {});

export const DEFAULT_LLM_MODEL: LlmModel = 'nvidia/nemotron-3-super-120b-a12b:free';
export const DEFAULT_LLM_ENDPOINT = 'https://openrouter.ai/api/v1';
