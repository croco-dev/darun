import { gql } from '@apollo/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { container } from '../app/serverContainer';

const query = gql`
  query VisualServerTimeoutFixture {
    visualScreenshot(id: "fixture") {
      id
    }
  }
`;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv('GRAPHQL_INTERNAL_URL', 'http://127.0.0.1:46120/graphql');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Visual server Apollo client through HttpLink', () => {
  it('aborts each unfinished fetch after 15 seconds and releases timers and upstream listeners', async () => {
    const signals: AbortSignal[] = [];
    const fetch = vi.fn<typeof globalThis.fetch>((_input, init) => {
      const signal = init?.signal;
      if (!signal) throw new Error('Expected an abortable server request');
      signals.push(signal);
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), {
          once: true,
        });
      });
    });
    vi.stubGlobal('fetch', fetch);
    const client = container.serverApolloClient;
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const upstream = new AbortController();
        const add = vi.spyOn(upstream.signal, 'addEventListener');
        const remove = vi.spyOn(upstream.signal, 'removeEventListener');
        let settled = false;
        const result = client
          .query({
            query,
            fetchPolicy: 'no-cache',
            context: { fetchOptions: { signal: upstream.signal } },
          })
          .then(
            () => {
              settled = true;
              return undefined;
            },
            (error: unknown) => {
              settled = true;
              return error;
            }
          );

        await vi.advanceTimersByTimeAsync(14_999);
        expect(settled).toBe(false);
        expect(signals[attempt]?.aborted).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        expect(settled).toBe(true);
        expect(await result).toMatchObject({ name: 'TimeoutError' });
        expect(signals[attempt]?.aborted).toBe(true);
        expect(upstream.signal.aborted).toBe(false);
        const listener = add.mock.calls.find(([event]) => event === 'abort')?.[1];
        expect(listener).toBeTypeOf('function');
        expect(remove).toHaveBeenCalledWith('abort', listener);
        expect(vi.getTimerCount()).toBe(0);
      }
      expect(fetch).toHaveBeenCalledTimes(3);
    } finally {
      client.stop();
    }
  });

  it.each([{ id: 'found-screenshot' }, null])('preserves a timely response containing %j', async screenshot => {
    const upstream = new AbortController();
    const add = vi.spyOn(upstream.signal, 'addEventListener');
    const remove = vi.spyOn(upstream.signal, 'removeEventListener');
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: { visualScreenshot: screenshot } }), {
        headers: { 'content-type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetch);
    const client = container.serverApolloClient;
    try {
      const result = client.query({
        query,
        context: { fetchOptions: { signal: upstream.signal } },
      });
      await vi.advanceTimersByTimeAsync(0);
      expect((await result).data).toEqual({ visualScreenshot: screenshot });
      const listener = add.mock.calls.find(([event]) => event === 'abort')?.[1];
      expect(listener).toBeTypeOf('function');
      expect(remove).toHaveBeenCalledWith('abort', listener);
      expect(vi.getTimerCount()).toBe(0);
      await vi.advanceTimersByTimeAsync(15_000);
      expect(fetch).toHaveBeenCalledTimes(1);
    } finally {
      client.stop();
    }
  });

  it('forwards an upstream cancellation and removes its listener and deadline', async () => {
    const upstream = new AbortController();
    const remove = vi.spyOn(upstream.signal, 'removeEventListener');
    let downstreamSignal: AbortSignal | null | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof globalThis.fetch>((_input, init) => {
        downstreamSignal = init?.signal;
        return new Promise((_resolve, reject) => {
          downstreamSignal?.addEventListener('abort', () => reject(downstreamSignal?.reason), { once: true });
        });
      })
    );
    const client = container.serverApolloClient;
    try {
      const result = client
        .query({
          query,
          context: { fetchOptions: { signal: upstream.signal } },
        })
        .catch((error: unknown) => error);
      const reason = new DOMException('Fixture cancelled', 'AbortError');
      upstream.abort(reason);
      await vi.advanceTimersByTimeAsync(0);
      expect(await result).toBe(reason);
      expect(downstreamSignal?.aborted).toBe(true);
      expect(remove).toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      client.stop();
    }
  });
});
