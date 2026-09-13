export type LlmSetting = {
  id: string;
  endpoint: string;
  apiKey?: string | null;
  model: string;
  thinkingLevel?: string | null;
  createdAt: Date;
  updatedAt: Date;
};
