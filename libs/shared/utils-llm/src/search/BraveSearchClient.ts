import { getBraveApiKey } from '../constant';
import type { WebSearchResult } from './types';

export type BraveSearchOptions = {
  count?: number;
};

type BraveApiResponse = {
  web?: {
    results?: Array<{
      title?: string;
      url?: string;
      description?: string;
      extra_snippets?: string[];
    }>;
  };
};

export class BraveSearchClient {
  private readonly endpoint: string;

  constructor(
    private readonly apiKeyProvider: () => string | undefined | Promise<string | undefined> = getBraveApiKey,
    endpoint?: string
  ) {
    this.endpoint = endpoint || 'https://api.search.brave.com/res/v1/web/search';
  }

  async search(query: string, options?: BraveSearchOptions): Promise<WebSearchResult[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return [];
    }

    try {
      const rawApiKey = await Promise.resolve(this.apiKeyProvider());
      const apiKey = rawApiKey?.trim();
      if (!apiKey) {
        return [];
      }

      const count = Math.min(Math.max(options?.count ?? 5, 1), 20);
      const url = new URL(this.endpoint);
      url.searchParams.set('q', trimmedQuery);
      url.searchParams.set('count', count.toString());

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey,
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        console.warn(
          `[BraveSearchClient] Web search request failed with status ${response.status} (${response.statusText})`
        );
        return [];
      }

      const data = (await response.json()) as BraveApiResponse;
      const results = data.web?.results || [];

      return results
        .filter((item): item is typeof item & { title: string; url: string; description: string } =>
          Boolean(item.title && item.url && item.description)
        )
        .map(item => ({
          title: item.title,
          url: item.url,
          description: item.description,
          extraSnippets: item.extra_snippets,
        }));
    } catch (error) {
      console.warn(
        `[BraveSearchClient] Error occurred during web search: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }
}
