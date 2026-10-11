import { withTimeout } from '../withTimeout';
import type { WebSearchKeyProvider, WebSearchOutcome, WebSearchResult } from './types';

const BRAVE_SEARCH_ENDPOINT = 'https://api.search.brave.com/res/v1/web/search';
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_COUNT = 20;
const MAX_QUERY_CHARS = 400;
const MAX_TITLE_CHARS = 300;
const MAX_DESCRIPTION_CHARS = 2_000;
const MAX_EXTRA_SNIPPETS = 5;
const MAX_EXTRA_SNIPPET_CHARS = 700;

type BraveRawResult = {
  title?: unknown;
  url?: unknown;
  description?: unknown;
  extra_snippets?: unknown;
};

function clampCount(count: number): number {
  if (!Number.isFinite(count)) {
    return 5;
  }
  return Math.min(Math.max(Math.floor(count), 1), MAX_COUNT);
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) : text;
}

function isHttpUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

function toExtraSnippets(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const snippets: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') {
      continue;
    }
    const trimmed = item.trim();
    if (trimmed.length === 0) {
      continue;
    }
    snippets.push(truncate(trimmed, MAX_EXTRA_SNIPPET_CHARS));
    if (snippets.length >= MAX_EXTRA_SNIPPETS) {
      break;
    }
  }
  return snippets;
}

function toResult(raw: BraveRawResult): WebSearchResult | null {
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const url = typeof raw.url === 'string' ? raw.url.trim() : '';
  const description = typeof raw.description === 'string' ? raw.description.trim() : '';
  if (title.length === 0 || url.length === 0 || !isHttpUrl(url)) {
    return null;
  }
  return {
    title: truncate(title, MAX_TITLE_CHARS),
    url,
    description: truncate(description, MAX_DESCRIPTION_CHARS),
    extraSnippets: toExtraSnippets(raw.extra_snippets),
  };
}

async function resolveKey(provider?: WebSearchKeyProvider): Promise<string | null> {
  if (!provider) {
    return null;
  }
  try {
    const key = await provider();
    if (typeof key !== 'string') {
      return null;
    }
    return key.trim().length > 0 ? key.trim() : null;
  } catch {
    return null;
  }
}

async function fetchOnce(query: string, count: number, apiKey: string): Promise<Response> {
  const url = new URL(BRAVE_SEARCH_ENDPOINT);
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(count));
  return withTimeout(
    fetch(url, {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': apiKey,
      },
    }),
    REQUEST_TIMEOUT_MS,
    'Brave search request timed out'
  );
}

function classifyStatus(status: number): WebSearchOutcome {
  if (status === 429) {
    return { ok: false, code: 'RATE_LIMITED', message: 'Brave search rate limit exceeded' };
  }
  return { ok: false, code: 'UPSTREAM_ERROR', message: `Brave search failed with status ${status}` };
}

export class BraveSearchClient {
  constructor(private readonly keyProvider?: WebSearchKeyProvider) {}

  async search(query: string, count = 5): Promise<WebSearchOutcome> {
    const normalizedQuery = query.trim().slice(0, MAX_QUERY_CHARS);
    if (normalizedQuery.length === 0) {
      return { ok: true, results: [] };
    }

    const apiKey = await resolveKey(this.keyProvider);
    if (!apiKey) {
      return { ok: false, code: 'NOT_CONFIGURED', message: 'Brave search API key is not configured' };
    }

    const clampedCount = clampCount(count);

    let response: Response;
    try {
      response = await fetchOnce(normalizedQuery, clampedCount, apiKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown search error';
      if (message.toLowerCase().includes('timed out')) {
        return { ok: false, code: 'TIMEOUT', message };
      }
      return { ok: false, code: 'UPSTREAM_ERROR', message };
    }

    if (!response.ok) {
      return classifyStatus(response.status);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return { ok: false, code: 'UPSTREAM_ERROR', message: 'Brave search returned invalid JSON' };
    }

    const rawResults =
      typeof body === 'object' && body !== null && 'web' in body
        ? (body as { web?: { results?: unknown } }).web?.results
        : (body as { results?: unknown }).results;

    if (rawResults === undefined) {
      return { ok: true, results: [] };
    }
    if (!Array.isArray(rawResults)) {
      return { ok: false, code: 'UPSTREAM_ERROR', message: 'Brave search returned malformed results' };
    }

    const results: WebSearchResult[] = [];
    for (const raw of rawResults) {
      if (typeof raw !== 'object' || raw === null) {
        continue;
      }
      const result = toResult(raw as BraveRawResult);
      if (result) {
        results.push(result);
      }
      if (results.length >= clampedCount) {
        break;
      }
    }

    return { ok: true, results };
  }
}
