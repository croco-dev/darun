import { describe, expect, it, vi } from 'vitest';
import { BraveSearchClient } from '../search/BraveSearchClient';

describe('W4-A4: BraveSearchClient propagates AbortSignal to fetch', () => {
  it('passes the stage signal to fetch and maps abort to TIMEOUT without retry', async () => {
    const fetchMock = vi.fn().mockImplementation((_url: unknown, init?: { signal?: AbortSignal }) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      const aborted = new Error('This operation was aborted');
      aborted.name = 'AbortError';
      return Promise.reject(aborted);
    });
    vi.stubGlobal('fetch', fetchMock);
    try {
      const controller = new AbortController();
      const outcome = await new BraveSearchClient(() => 'key').search('linear', 5, controller.signal);
      expect(outcome).toEqual({ ok: false, code: 'TIMEOUT', message: 'Brave search was aborted' });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
