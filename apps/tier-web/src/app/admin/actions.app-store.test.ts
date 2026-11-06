import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchAndAddApps } from './actions';

const fixture = vi.hoisted(() => ({ client: undefined as unknown, apple: vi.fn(), database: vi.fn() }));
vi.mock('@/utils/admin', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/utils/supabase/server', () => ({
  createClient: () => fixture.client,
  createAdminClient: () => fixture.client,
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const keyword = '테스트 앱';
function search() {
  const form = new FormData();
  form.set('keyword', keyword);
  return searchAndAddApps({ status: 'idle', message: '' }, form);
}
function results(count: number) {
  return { results: Array.from({ length: count }, (_, index) => ({ trackId: index + 123, trackName: `앱 ${index}` })) };
}
function expectRetryableError(result: Awaited<ReturnType<typeof search>>) {
  expect(result.status).toBe('error');
  expect(result.message).toContain('다시 시도');
  expect(result).not.toHaveProperty('searched');
  expect(fixture.database).not.toHaveBeenCalled();
  expect(revalidatePath).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('fetch', fixture.apple);
  fixture.client = createClient('http://localhost:4485', 'fixture-only', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fixture.database },
  });
  fixture.database.mockResolvedValue(new Response(JSON.stringify([{ id: 'new-app' }])));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('bounded App Store collection', () => {
  it('aborts a request that has not returned headers at the ten-second deadline', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    fixture.apple.mockImplementation((_url, init: RequestInit | undefined) => {
      signal = init?.signal ?? undefined;
      const requestSignal = signal;
      return new Promise((_resolve, reject) =>
        requestSignal?.addEventListener('abort', () => reject(requestSignal.reason))
      );
    });
    let settled = false;
    const request = search().then(result => {
      settled = true;
      return result;
    });
    await vi.advanceTimersByTimeAsync(9_999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(signal?.aborted).toBe(true);
    expect(settled).toBe(true);
    expectRetryableError(await request);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps one deadline from fetch through an unfinished body and cancels the reader', async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({ cancel });
    fixture.apple.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 6_000));
      return new Response(body);
    });
    let settled = false;
    const request = search().then(result => {
      settled = true;
      return result;
    });
    await vi.advanceTimersByTimeAsync(9_999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toBe(true);
    expectRetryableError(await request);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(body.locked).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([undefined, '1'])('rejects actual bytes above 2 MiB despite Content-Length %s', async length => {
    const cancel = vi.fn();
    let reads = 0;
    const body = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          if (reads === 3) {
            controller.close();
            return;
          }
          reads++;
          controller.enqueue(new Uint8Array(1_048_576));
        },
        cancel,
      },
      { highWaterMark: 0 }
    );
    fixture.apple.mockResolvedValue(new Response(body, { headers: length ? { 'Content-Length': length } : {} }));
    expectRetryableError(await search());
    expect(reads).toBe(3);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(body.locked).toBe(false);
  });

  it('accepts exactly 2 MiB, counts UTF-8 bytes, and preserves duplicate skipping at 25 apps', async () => {
    const payload = JSON.stringify(results(25));
    const json = payload + ' '.repeat(2_097_152 - new TextEncoder().encode(payload).byteLength);
    fixture.apple.mockResolvedValue(new Response(json));
    const result = await search();
    expect(result).toMatchObject({ status: 'success', searched: 25, added: 1 });
    const [url, init] = fixture.database.mock.calls[0];
    expect(String(url)).toContain('on_conflict=app_store_id');
    expect(new Headers(init.headers).get('prefer')).toContain('resolution=ignore-duplicates');
    const stored = JSON.parse(init.body);
    expect(stored).toHaveLength(25);
    expect(stored[0]).toMatchObject({ app_store_id: 'id123', name: '앱 0' });
    const appleUrl = new URL(String(fixture.apple.mock.calls[0][0]));
    expect(appleUrl.searchParams.get('term')).toBe(keyword);
    expect(appleUrl.searchParams.get('limit')).toBe('25');
  });

  it('rejects 26 results before writing even if some rows are invalid', async () => {
    const payload = results(25);
    payload.results.push({ trackId: -1, trackName: '' });
    fixture.apple.mockResolvedValue(new Response(JSON.stringify(payload)));
    expectRetryableError(await search());
  });

  it.each(['status', 'json', 'envelope'] as const)('returns a retryable failure for invalid %s', async kind => {
    fixture.apple.mockResolvedValue(
      new Response(kind === 'json' ? '{' : '{}', { status: kind === 'status' ? 503 : 200 })
    );
    expectRetryableError(await search());
  });
});
