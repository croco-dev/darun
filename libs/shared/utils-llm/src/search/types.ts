export type WebSearchResult = {
  title: string;
  url: string;
  description: string;
  extraSnippets?: string[];
};

export interface McpTool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute(input: TInput): Promise<TOutput>;
}
