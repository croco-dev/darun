// @vitest-environment node
import { ApolloClient, ApolloLink, InMemoryCache, execute, gql } from '@apollo/client';
import { BatchHttpLink } from '@apollo/client/link/batch-http';
import { createTimeoutLink, TimeoutError } from '@darun/utils-apollo-client/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { container as service } from '../../service-web/app/container';
import { container as visual } from '../../visual-web/app/container';
import { container as admin } from '../app/container';

const first = gql`
  query First {
    value
  }
`;
const second = gql`
  query Second {
    value
  }
`;

function fixture(httpLink: ApolloLink, fullChain = false) {
  const requests: {
    names: string[];
    signal: AbortSignal;
    respond: () => void;
    fail: () => void;
  }[] = [];
  const fetch = vi.fn(
    (_uri: unknown, options: RequestInit) =>
      new Promise<Response>((resolve, reject) => {
        const body = JSON.parse(options.body as string);
        const operations = Array.isArray(body) ? body : [body];
        const signal = options.signal!;
        const abort = () => reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
        signal.addEventListener('abort', abort, { once: true });
        if (signal.aborted) abort();
        requests.push({
          names: operations.map((op: { operationName: string }) => op.operationName),
          signal,
          fail: () => {
            signal.removeEventListener('abort', abort);
            reject(new Error('Connection lost'));
          },
          respond: () => {
            signal.removeEventListener('abort', abort);
            const results = operations.map((op: { operationName: string }) => ({
              data: { value: op.operationName },
            }));
            resolve(
              new Response(JSON.stringify(Array.isArray(body) ? results : results[0]), {
                headers: { 'content-type': 'application/json' },
              })
            );
          },
        });
      })
  );
  vi.stubGlobal('fetch', fetch);
  const link = fullChain ? httpLink : ApolloLink.from([createTimeoutLink(), httpLink]);
  const start = (query: typeof first, timeout = 500, controller = new AbortController()) => {
    const next = vi.fn();
    const error = vi.fn();
    const complete = vi.fn();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    const subscription = execute(
      link,
      {
        query,
        context: {
          timeout,
          fetch,
          fetchOptions: { signal: controller.signal },
        },
      },
      { client: new ApolloClient({ cache: new InMemoryCache(), link }) }
    ).subscribe({ next, error, complete });
    return { next, error, complete, remove, subscription, controller };
  };
  return { requests, fetch, start };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('reproduces cancellation leaking through the previous BatchHttpLink transport', async () => {
  const f = fixture(
    new BatchHttpLink({
      uri: 'https://fixture.invalid/graphql',
      batchInterval: 20,
    })
  );
  const a = f.start(first);
  const b = f.start(second);
  await vi.advanceTimersByTimeAsync(20);
  expect(f.requests.map(r => r.names)).toEqual([['First', 'Second']]);
  a.subscription.unsubscribe();
  await vi.advanceTimersByTimeAsync(0);
  expect(f.requests[0]!.signal.aborted).toBe(true);
  expect(b.error).toHaveBeenCalledOnce();
  expect(b.error.mock.calls[0]![0].name).toBe('AbortError');
  expect(vi.getTimerCount()).toBe(0);
});

for (const [name, container] of [
  ['service', service],
  ['admin', admin],
  ['visual', visual],
] as const) {
  describe(`${name} actual transport`, () => {
    it('does not retry a mutation whose transport fails after submission', async () => {
      const client = 'getApolloClient' in container ? container.getApolloClient('ko') : container.apolloClient;
      const f = fixture(client.link, true);
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      const operation = f.start(gql`
        mutation Save {
          save
        }
      `);
      expect(f.requests.map(r => r.names)).toEqual([['Save']]);
      f.requests[0]!.fail();
      await vi.advanceTimersByTimeAsync(1000);
      expect(operation.error).toHaveBeenCalledOnce();
      expect(f.fetch).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
      log.mockRestore();
    });

    it.each([0, 1])('keeps the other query alive when subscription %i is cancelled', async index => {
      const f = fixture(container.httpLink);
      const operations = [f.start(first), f.start(second)];
      await vi.advanceTimersByTimeAsync(20);
      expect(f.requests.map(r => r.names)).toEqual([['First'], ['Second']]);
      operations[index]!.subscription.unsubscribe();
      expect(f.requests[index]!.signal.aborted).toBe(true);
      expect(f.requests[1 - index]!.signal.aborted).toBe(false);
      f.requests[1 - index]!.respond();
      await vi.advanceTimersByTimeAsync(0);
      expect(operations[1 - index]!.next).toHaveBeenCalledWith({
        data: { value: index === 0 ? 'Second' : 'First' },
      });
      expect(operations[1 - index]!.complete).toHaveBeenCalledOnce();
      expect(operations[1 - index]!.error).not.toHaveBeenCalled();
      expect(f.fetch).toHaveBeenCalledTimes(2);
      for (const op of operations) expect(op.remove).toHaveBeenCalledWith('abort', expect.any(Function));
      expect(vi.getTimerCount()).toBe(0);
    });

    it.each([0, 1])('isolates a shorter timeout on query %i', async index => {
      const f = fixture(container.httpLink);
      const operations = [f.start(first, index === 0 ? 30 : 100), f.start(second, index === 1 ? 30 : 100)];
      await vi.advanceTimersByTimeAsync(30);
      expect(operations[index]!.error.mock.calls[0]![0]).toBeInstanceOf(TimeoutError);
      expect(f.requests[index]!.signal.aborted).toBe(true);
      expect(f.requests[1 - index]!.signal.aborted).toBe(false);
      f.requests[1 - index]!.respond();
      await vi.advanceTimersByTimeAsync(0);
      expect(operations[1 - index]!.complete).toHaveBeenCalledOnce();
      expect(operations[1 - index]!.error).not.toHaveBeenCalled();
      expect(f.fetch).toHaveBeenCalledTimes(2);
      expect(vi.getTimerCount()).toBe(0);
    });

    it.each([0, 1])('isolates upstream abort on query %i and cleans up all subscriptions', async index => {
      const f = fixture(container.httpLink);
      const operations = [f.start(first), f.start(second)];
      await vi.advanceTimersByTimeAsync(20);
      operations[index]!.controller.abort(new DOMException('Navigation', 'AbortError'));
      await vi.advanceTimersByTimeAsync(0);
      expect(operations[index]!.error.mock.calls[0]![0].name).toBe('AbortError');
      expect(f.requests[1 - index]!.signal.aborted).toBe(false);
      operations[1 - index]!.subscription.unsubscribe();
      expect(f.requests.every(r => r.signal.aborted)).toBe(true);
      for (const op of operations) expect(op.remove).toHaveBeenCalledWith('abort', expect.any(Function));
      expect(f.fetch).toHaveBeenCalledTimes(2);
      expect(vi.getTimerCount()).toBe(0);
    });
  });
}
