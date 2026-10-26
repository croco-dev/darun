import { withAbortableStage } from '../withTimeout';
import type { WebSearchKeyProvider, WebSearchOutcome, WebSearchResult } from './types';

const BRAVE_SEARCH_ENDPOINT = 'https://api.search.brave.com/res/v1/web/search';
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
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
  const key = await provider();
  if (typeof key !== 'string') {
    return null;
  }
  return key.trim().length > 0 ? key.trim() : null;
}

type SettledResponse = { ok: boolean; status: number; body: unknown };

/** Success bodies that cannot be parsed keep the existing invalid-JSON classification. */
class InvalidJsonBodyError extends Error {
  constructor() {
    super('Brave search returned invalid JSON');
    this.name = 'InvalidJsonBodyError';
  }
}

class ResponseTooLargeError extends Error {
  constructor() {
    super(`Brave search response exceeds ${MAX_RESPONSE_BYTES} bytes`);
    this.name = 'ResponseTooLargeError';
  }
}

async function readBoundedJson(response: Response): Promise<unknown> {
  if (Number(response.headers.get('content-length')) > MAX_RESPONSE_BYTES) {
    await response.body?.cancel().catch(() => undefined);
    throw new ResponseTooLargeError();
  }
  if (!response.body) {
    throw new InvalidJsonBodyError();
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = '';
  let finished = false;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        finished = true;
        break;
      }
      received += value.byteLength;
      if (received > MAX_RESPONSE_BYTES) {
        throw new ResponseTooLargeError();
      }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode()) as unknown;
  } finally {
    if (!finished) {
      await reader.cancel().catch(() => undefined);
    }
    reader.releaseLock();
  }
}

async function fetchOnce(query: string, count: number, apiKey: string, signal?: AbortSignal): Promise<SettledResponse> {
  const url = new URL(BRAVE_SEARCH_ENDPOINT);
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(count));
  // 헤더만 도착한 stalled body도 중단되도록 본문 수신까지 budget·부모 신호가 실제 fetch에 연결된 채로 유지된다.
  return withAbortableStage(
    async childSignal => {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'X-Subscription-Token': apiKey },
        signal: childSignal,
      });
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        return { ok: false, status: response.status, body: undefined };
      }
      try {
        return { ok: true, status: response.status, body: await readBoundedJson(response) };
      } catch (error) {
        // budget·부모 중단으로 끊긴 본문은 원래 오류로 남겨 TIMEOUT 분류가 되게 한다.
        if (childSignal.aborted || error instanceof ResponseTooLargeError) {
          throw error;
        }
        throw new InvalidJsonBodyError();
      }
    },
    { budgetMs: REQUEST_TIMEOUT_MS, signal, message: 'Brave search request timed out' }
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

  async search(query: string, count = 5, signal?: AbortSignal): Promise<WebSearchOutcome> {
    const normalizedQuery = query.trim().slice(0, MAX_QUERY_CHARS);
    if (normalizedQuery.length === 0) {
      return { ok: true, results: [] };
    }

    const apiKey = await resolveKey(this.keyProvider);
    if (!apiKey) {
      return { ok: false, code: 'NOT_CONFIGURED', message: 'Brave search API key is not configured' };
    }

    const clampedCount = clampCount(count);

    // 호출자 abort는 타임아웃과 구분 없이 TIMEOUT 계약으로 신호한다.
    // 호출자는 in_progress lease를 만료·recovery에 맡기고 terminal 실패로 확정하지 않는다.
    if (signal?.aborted) {
      return { ok: false, code: 'TIMEOUT', message: 'Brave search was aborted' };
    }

    let response: SettledResponse;
    try {
      response = await fetchOnce(normalizedQuery, clampedCount, apiKey, signal);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown search error';
      if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
        return { ok: false, code: 'TIMEOUT', message: 'Brave search was aborted' };
      }
      if (message.toLowerCase().includes('timed out')) {
        return { ok: false, code: 'TIMEOUT', message };
      }
      return { ok: false, code: 'UPSTREAM_ERROR', message };
    }

    if (!response.ok) {
      return classifyStatus(response.status);
    }

    const body = response.body;

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
