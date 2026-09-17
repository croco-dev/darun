import { BraveSearchClient } from './BraveSearchClient';
import type { McpTool, WebSearchResult } from './types';

export type BraveWebSearchInput = {
  query: string;
  count?: number;
};

export class BraveWebSearchMcpTool implements McpTool<BraveWebSearchInput, WebSearchResult[]> {
  readonly name = 'brave_web_search';

  readonly description =
    'Search the web using Brave Search API to retrieve current information, features, documentation, and reviews for tech products and software.';

  readonly inputSchema = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query to look up on the web',
      },
      count: {
        type: 'number',
        description: 'The number of search results to retrieve (1 to 20, default: 5)',
      },
    },
    required: ['query'],
  };

  constructor(private readonly client: BraveSearchClient = new BraveSearchClient()) {}

  async execute(input: BraveWebSearchInput): Promise<WebSearchResult[]> {
    return this.client.search(input.query, { count: input.count });
  }
}
