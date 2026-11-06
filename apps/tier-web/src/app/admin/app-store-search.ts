import { z } from 'zod';

const APP_STORE_TIMEOUT_MS = 10_000;
const APP_STORE_MAX_BODY_BYTES = 2 * 1024 * 1024;
const APP_STORE_MAX_RESULTS = 25;

const keywordSchema = z.string().trim().min(1).max(100);

const appleSearchResultSchema = z.object({
  trackId: z.number().int().positive(),
  trackName: z.string().trim().min(1),
  description: z.string().nullish(),
  artworkUrl512: z.string().url().nullish(),
});

const appleSearchResponseSchema = z.object({
  results: z.array(z.unknown()).max(APP_STORE_MAX_RESULTS),
});

export type AppStoreApp = {
  app_store_id: string;
  name: string;
  description: string;
  icon_url: string;
};

export function parseAppStoreKeyword(value: unknown): string | null {
  const parsed = keywordSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseAppleSearchResponse(value: unknown): AppStoreApp[] | null {
  const response = appleSearchResponseSchema.safeParse(value);
  if (!response.success) return null;

  return response.data.results.flatMap(result => {
    const app = appleSearchResultSchema.safeParse(result);
    if (!app.success) return [];

    return {
      app_store_id: `id${app.data.trackId}`,
      name: app.data.trackName,
      description: app.data.description ?? '',
      icon_url: app.data.artworkUrl512 ?? '',
    };
  });
}

export async function fetchAppStoreApps(keyword: string): Promise<AppStoreApp[] | null> {
  const url = new URL('https://itunes.apple.com/search');
  url.searchParams.set('term', keyword);
  url.searchParams.set('country', 'kr');
  url.searchParams.set('entity', 'software');
  url.searchParams.set('limit', String(APP_STORE_MAX_RESULTS));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), APP_STORE_TIMEOUT_MS);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const cancelBody = () => {
    void reader?.cancel().catch(() => {});
  };

  try {
    const response = await fetch(url, { signal: controller.signal });
    reader = response.body?.getReader();
    controller.signal.addEventListener('abort', cancelBody, { once: true });
    controller.signal.throwIfAborted();
    if (!response.ok || !reader) throw new Error('Apple Search API request failed');

    const decoder = new TextDecoder();
    let receivedBytes = 0;
    let body = '';
    while (true) {
      const { done, value } = await reader.read();
      controller.signal.throwIfAborted();
      if (done) break;
      receivedBytes += value.byteLength;
      if (receivedBytes > APP_STORE_MAX_BODY_BYTES) throw new Error('Apple Search API response too large');
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    return parseAppleSearchResponse(JSON.parse(body));
  } catch (error) {
    controller.abort();
    throw error;
  } finally {
    clearTimeout(timer);
    controller.signal.removeEventListener('abort', cancelBody);
    reader?.releaseLock();
  }
}
