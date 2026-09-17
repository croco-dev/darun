export type LlmConfig = {
  endpoint: string;
  apiKey: string;
  model: string;
  thinkingLevel?: string | null;
  braveApiKey?: string | null;
};

export interface LlmConfigProvider {
  getConfig(): Promise<LlmConfig>;
}
