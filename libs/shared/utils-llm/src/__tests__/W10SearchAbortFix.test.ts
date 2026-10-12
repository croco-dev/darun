import { describe, expect, it, vi } from 'vitest';
import { BraveSearchClient } from '../search/BraveSearchClient';

describe('W10 lease abort fix: BraveSearchClient caller abort', () => {
  it('B-A4: 호출자 abort는 TIMEOUT 계약으로 신호하고 lease를 recovery에 맡긴다', async () => {
    const fetchMock = vi.fn().mockImplementation((_url: unknown, init?: { signal?: AbortSignal }) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      const aborted = new Error('This operation was aborted');
      aborted.name = 'AbortError';
      return Promise.reject(aborted);
    });
    vi.stubGlobal('fetch', fetchMock);
    try {
      const controller = new AbortController();
      controller.abort();
      const client = new BraveSearchClient(() => 'key');
      const outcome = await client.search('linear', 5, controller.signal);
      expect(outcome).toEqual({ ok: false, code: 'TIMEOUT', message: 'Brave search was aborted' });
      // 이미 중단된 신호는 fetch까지 가지 않고 즉시 반환된다.
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
