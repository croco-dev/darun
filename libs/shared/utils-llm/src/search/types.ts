export type WebSearchResult = {
  title: string;
  url: string;
  description: string;
  extraSnippets?: string[];
};

export type WebSearchFailureCode = 'NOT_CONFIGURED' | 'RATE_LIMITED' | 'TIMEOUT' | 'UPSTREAM_ERROR';

export type WebSearchOutcome =
  | { ok: true; results: WebSearchResult[] }
  | { ok: false; code: WebSearchFailureCode; message?: string };

export type WebSearchKeyProvider = () => Promise<string | null | undefined> | string | null | undefined;
