export type LlmConfig = {
  endpoint: string;
  apiKey: string;
  model: string;
  /** null selects the model default; omission inherits the environment default. */
  thinkingLevel?: string | null;
};

export interface LlmConfigProvider {
  getConfig(): Promise<LlmConfig>;
}
