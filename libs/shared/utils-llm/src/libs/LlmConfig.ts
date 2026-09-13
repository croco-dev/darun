export type LlmConfig = {
  endpoint: string;
  apiKey: string;
  model: string;
  thinkingLevel?: string | null;
};

export interface LlmConfigProvider {
  getConfig(): Promise<LlmConfig>;
}
