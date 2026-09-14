import { ApolloLink, Observable, execute, gql } from '@apollo/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_APOLLO_TIMEOUT_MS,
  TimeoutError,
  createTimeoutLink,
  isTimeoutOrAbortError,
  shouldRetryOperation,
} from '../createTimeoutLink';

const TEST_QUERY = gql`
  query TestQuery {
    test
  }
`;

const runLink = (link: ApolloLink, request: Parameters<typeof execute>[1]) => {
  return execute(link, request, { client: null as never });
};

describe('createTimeoutLink', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isTimeoutOrAbortError', () => {
    it('identifies TimeoutError instances and name matches', () => {
      expect(isTimeoutOrAbortError(new TimeoutError('timed out'))).toBe(true);
      expect(isTimeoutOrAbortError({ name: 'TimeoutError' })).toBe(true);
    });

    it('identifies AbortError', () => {
      expect(isTimeoutOrAbortError({ name: 'AbortError' })).toBe(true);
      expect(isTimeoutOrAbortError({ message: 'The user aborted a request' })).toBe(true);
    });

    it('identifies error with timed out, timeout, or aborted in message', () => {
      expect(isTimeoutOrAbortError(new Error("operation 'GetUser' timed out after 5000ms"))).toBe(true);
      expect(isTimeoutOrAbortError(new Error('Gateway timeout'))).toBe(true);
      expect(isTimeoutOrAbortError(new Error('Connection aborted by peer'))).toBe(true);
    });

    it('recursively checks networkError in ApolloError-like structures', () => {
      expect(
        isTimeoutOrAbortError({
          name: 'ApolloError',
          message: 'Network error',
          networkError: new TimeoutError('timed out'),
        })
      ).toBe(true);

      expect(
        isTimeoutOrAbortError({
          name: 'ApolloError',
          message: 'Wrapped error',
          networkError: {
            name: 'NestedError',
            networkError: new Error('socket timeout'),
          },
        })
      ).toBe(true);
    });

    it('returns false for unrelated errors or non-objects', () => {
      expect(isTimeoutOrAbortError(null)).toBe(false);
      expect(isTimeoutOrAbortError(undefined)).toBe(false);
      expect(isTimeoutOrAbortError(new Error('Syntax error'))).toBe(false);
      expect(isTimeoutOrAbortError({ name: 'ServerError', statusCode: 500 })).toBe(false);
    });
  });

  describe('shouldRetryOperation', () => {
    it('returns false for TimeoutError and AbortError', () => {
      expect(shouldRetryOperation(new TimeoutError('timed out'))).toBe(false);
      expect(shouldRetryOperation({ name: 'AbortError' })).toBe(false);
      expect(shouldRetryOperation(new Error('Gateway timeout'))).toBe(false);
    });

    it('returns false for mutations', () => {
      const mutationOp = {
        query: {
          definitions: [{ kind: 'OperationDefinition', operation: 'mutation' }],
        },
      };
      expect(shouldRetryOperation(new Error('Network error'), mutationOp)).toBe(false);
    });

    it('returns true for queries with standard network errors', () => {
      const queryOp = {
        query: {
          definitions: [{ kind: 'OperationDefinition', operation: 'query' }],
        },
      };
      expect(shouldRetryOperation(new Error('Network error'), queryOp)).toBe(true);
    });

    it('returns false when error is falsy', () => {
      expect(shouldRetryOperation(null)).toBe(false);
      expect(shouldRetryOperation(undefined)).toBe(false);
    });
  });

  it('uses default timeout of 15000ms when called without options', async () => {
    const hangingDownstream = new ApolloLink(() => new Observable(() => {}));
    const link = ApolloLink.from([createTimeoutLink(), hangingDownstream]);

    let receivedError: unknown;
    runLink(link, { query: TEST_QUERY }).subscribe({
      error: err => {
        receivedError = err;
      },
    });

    vi.advanceTimersByTime(DEFAULT_APOLLO_TIMEOUT_MS - 1);
    expect(receivedError).toBeUndefined();

    vi.advanceTimersByTime(1);
    expect(receivedError).toBeInstanceOf(TimeoutError);
    expect((receivedError as Error).message).toContain(`timed out after ${DEFAULT_APOLLO_TIMEOUT_MS}ms`);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('allows fast operations to complete successfully before timeout and clears timer', async () => {
    const mockDownstream = new ApolloLink(() => {
      return new Observable(observer => {
        observer.next({ data: { test: 'success' } });
        observer.complete();
      });
    });

    const link = ApolloLink.from([createTimeoutLink({ defaultTimeoutMs: 1000 }), mockDownstream]);

    let nextValue: unknown;
    let completed = false;

    runLink(link, { query: TEST_QUERY }).subscribe({
      next: val => {
        nextValue = val;
      },
      complete: () => {
        completed = true;
      },
    });

    expect(nextValue).toEqual({ data: { test: 'success' } });
    expect(completed).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('forwards downstream errors that occur before timeout and clears timer', async () => {
    const expectedError = new Error('Database down');
    const mockDownstream = new ApolloLink(() => {
      return new Observable(observer => {
        observer.error(expectedError);
      });
    });

    const link = ApolloLink.from([createTimeoutLink({ defaultTimeoutMs: 1000 }), mockDownstream]);

    let receivedError: unknown;

    runLink(link, { query: TEST_QUERY }).subscribe({
      error: err => {
        receivedError = err;
      },
    });

    expect(receivedError).toBe(expectedError);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('times out, emits TimeoutError, unrolls downstream subscription, and clears timers', async () => {
    let downstreamAborted = false;
    let downstreamUnsubscribed = false;

    const hangingDownstream = new ApolloLink(operation => {
      return new Observable(() => {
        const signal = operation.getContext().fetchOptions?.signal as AbortSignal | undefined;
        signal?.addEventListener('abort', () => {
          downstreamAborted = true;
        });
        return () => {
          downstreamUnsubscribed = true;
        };
      });
    });

    const link = ApolloLink.from([
      createTimeoutLink({ defaultTimeoutMs: DEFAULT_APOLLO_TIMEOUT_MS }),
      hangingDownstream,
    ]);

    let receivedError: Error | undefined;

    runLink(link, { query: TEST_QUERY }).subscribe({
      error: err => {
        receivedError = err;
      },
    });

    expect(receivedError).toBeUndefined();
    expect(downstreamAborted).toBe(false);
    expect(downstreamUnsubscribed).toBe(false);

    // Advance time to right before timeout
    vi.advanceTimersByTime(DEFAULT_APOLLO_TIMEOUT_MS - 1);
    expect(receivedError).toBeUndefined();

    // Advance past timeout
    vi.advanceTimersByTime(1);
    expect(receivedError).toBeInstanceOf(TimeoutError);
    expect(receivedError?.name).toBe('TimeoutError');
    expect(receivedError?.message).toBe(`GraphQL operation 'TestQuery' timed out after ${DEFAULT_APOLLO_TIMEOUT_MS}ms`);
    expect(downstreamAborted).toBe(true);
    expect(downstreamUnsubscribed).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('respects per-operation context timeout override', async () => {
    const hangingDownstream = new ApolloLink(() => new Observable(() => {}));
    const link = ApolloLink.from([createTimeoutLink({ defaultTimeoutMs: 15000 }), hangingDownstream]);

    let receivedError: Error | undefined;

    const shortOpQuery = gql`
      query ShortOp {
        test
      }
    `;

    runLink(link, {
      query: shortOpQuery,
      context: { timeout: 3000 },
    }).subscribe({
      error: err => {
        receivedError = err;
      },
    });

    vi.advanceTimersByTime(2999);
    expect(receivedError).toBeUndefined();

    vi.advanceTimersByTime(1);
    expect(receivedError).toBeInstanceOf(TimeoutError);
    expect(receivedError?.message).toContain('timed out after 3000ms');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('disables timeout when context timeout is 0 or negative', async () => {
    const hangingDownstream = new ApolloLink(() => new Observable(() => {}));
    const link = ApolloLink.from([createTimeoutLink({ defaultTimeoutMs: 1000 }), hangingDownstream]);

    for (const timeoutVal of [0, -1, -5000]) {
      let receivedError: unknown;

      runLink(link, {
        query: TEST_QUERY,
        context: { timeout: timeoutVal },
      }).subscribe({
        error: err => {
          receivedError = err;
        },
      });

      vi.advanceTimersByTime(5000);
      expect(receivedError).toBeUndefined();
      expect(vi.getTimerCount()).toBe(0);
    }
  });

  it('handles non-finite or invalid timeout values by falling back to default timeout', async () => {
    const hangingDownstream = new ApolloLink(() => new Observable(() => {}));
    const link = ApolloLink.from([createTimeoutLink({ defaultTimeoutMs: 2000 }), hangingDownstream]);

    for (const invalidTimeout of [NaN, Infinity, -Infinity]) {
      let receivedError: unknown;
      runLink(link, {
        query: TEST_QUERY,
        context: { timeout: invalidTimeout },
      }).subscribe({
        error: err => {
          receivedError = err;
        },
      });

      vi.advanceTimersByTime(1999);
      expect(receivedError).toBeUndefined();

      vi.advanceTimersByTime(1);
      expect(receivedError).toBeInstanceOf(TimeoutError);
      expect(vi.getTimerCount()).toBe(0);
    }
  });

  it('aborts downstream and cleans up timer when subscriber unsubscribes early', async () => {
    let downstreamAborted = false;
    let downstreamUnsubscribed = false;

    const mockDownstream = new ApolloLink(operation => {
      return new Observable(() => {
        const signal = operation.getContext().fetchOptions?.signal as AbortSignal | undefined;
        signal?.addEventListener('abort', () => {
          downstreamAborted = true;
        });
        return () => {
          downstreamUnsubscribed = true;
        };
      });
    });

    const link = ApolloLink.from([createTimeoutLink({ defaultTimeoutMs: 5000 }), mockDownstream]);

    const subscription = runLink(link, { query: TEST_QUERY }).subscribe({});

    expect(downstreamAborted).toBe(false);
    expect(vi.getTimerCount()).toBe(1);

    // Unsubscribe early
    subscription.unsubscribe();
    expect(downstreamAborted).toBe(true);
    expect(downstreamUnsubscribed).toBe(true);
    expect(vi.getTimerCount()).toBe(0);

    // Advance time past original timeout - no error should fire
    vi.advanceTimersByTime(6000);
  });

  it('chains with existing fetchOptions signal', async () => {
    let downstreamAborted = false;
    let abortReason: unknown;

    const mockDownstream = new ApolloLink(operation => {
      return new Observable(() => {
        const signal = operation.getContext().fetchOptions?.signal as AbortSignal | undefined;
        signal?.addEventListener('abort', () => {
          downstreamAborted = true;
          abortReason = signal.reason;
        });
      });
    });

    const link = ApolloLink.from([createTimeoutLink({ defaultTimeoutMs: 10000 }), mockDownstream]);

    const outerController = new AbortController();

    runLink(link, {
      query: TEST_QUERY,
      context: {
        fetchOptions: {
          signal: outerController.signal,
        },
      },
    }).subscribe({});

    expect(downstreamAborted).toBe(false);

    outerController.abort(new Error('User navigated away'));

    expect(downstreamAborted).toBe(true);
    expect(abortReason).toEqual(new Error('User navigated away'));
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cleans up abort event listener from upstream signal upon completion', async () => {
    const originalController = new AbortController();
    const removeSpy = vi.spyOn(originalController.signal, 'removeEventListener');

    const mockDownstream = new ApolloLink(() => {
      return new Observable(observer => {
        observer.next({ data: { test: 'ok' } });
        observer.complete();
      });
    });

    const link = ApolloLink.from([createTimeoutLink({ defaultTimeoutMs: 5000 }), mockDownstream]);

    runLink(link, {
      query: TEST_QUERY,
      context: { fetchOptions: { signal: originalController.signal } },
    }).subscribe({});

    expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });

  it('fails immediately without invoking downstream when upstream signal is pre-aborted', async () => {
    let downstreamCalled = false;
    const mockDownstream = new ApolloLink(() => {
      downstreamCalled = true;
      return new Observable(() => {});
    });
    const link = ApolloLink.from([createTimeoutLink({ defaultTimeoutMs: 5000 }), mockDownstream]);
    const controller = new AbortController();
    const abortReason = new Error('Pre-aborted request');
    controller.abort(abortReason);

    let receivedError: unknown;
    runLink(link, {
      query: TEST_QUERY,
      context: { fetchOptions: { signal: controller.signal } },
    }).subscribe({
      error: err => {
        receivedError = err;
      },
    });

    expect(receivedError).toBe(abortReason);
    expect(downstreamCalled).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('handles synchronous downstream errors and immediately clears timers', async () => {
    const syncError = new Error('Immediate downstream failure');
    const mockDownstream = new ApolloLink(() => {
      throw syncError;
    });
    const link = ApolloLink.from([createTimeoutLink({ defaultTimeoutMs: 5000 }), mockDownstream]);

    let receivedError: unknown;
    runLink(link, { query: TEST_QUERY }).subscribe({
      error: err => {
        receivedError = err;
      },
    });

    expect(receivedError).toBe(syncError);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('restores original signal so retries reusing the same operation are not poisoned by an aborted controller signal', async () => {
    let attempt = 0;
    const observedSignals: (AbortSignal | undefined)[] = [];

    const mockDownstream = new ApolloLink(operation => {
      attempt++;
      const currentSignal = operation.getContext().fetchOptions?.signal as AbortSignal | undefined;
      observedSignals.push(currentSignal);
      return new Observable(observer => {
        if (attempt === 1) {
          // Attempt 1 fails with transient network error
          observer.error(new Error('Transient failure'));
        } else {
          // Attempt 2 succeeds
          observer.next({ data: { test: 'retry success' } });
          observer.complete();
        }
      });
    });

    const timeoutLink = createTimeoutLink({ defaultTimeoutMs: 5000 });

    // Custom retry link that replays the EXACT SAME operation instance
    const retryingLink = new ApolloLink((operation, forward) => {
      return new Observable(observer => {
        forward(operation).subscribe({
          next: val => observer.next(val),
          complete: () => observer.complete(),
          error: () => {
            // Forward the same operation instance a second time
            forward(operation).subscribe({
              next: val => observer.next(val),
              error: err => observer.error(err),
              complete: () => observer.complete(),
            });
          },
        });
      });
    });

    const link = ApolloLink.from([retryingLink, timeoutLink, mockDownstream]);
    const originalController = new AbortController();

    let finalResult: unknown;
    runLink(link, {
      query: TEST_QUERY,
      context: { fetchOptions: { signal: originalController.signal } },
    }).subscribe({
      next: val => {
        finalResult = val;
      },
    });

    expect(attempt).toBe(2);
    expect(finalResult).toEqual({ data: { test: 'retry success' } });
    expect(observedSignals[0]).not.toBe(observedSignals[1]);
    expect(observedSignals[1]?.aborted).toBe(false);
    expect(originalController.signal.aborted).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ignores rogue downstream emissions after timeout has already triggered', async () => {
    let emitNext: ((val: { data?: Record<string, unknown> }) => void) | undefined;
    let emitError: ((err: unknown) => void) | undefined;
    let emitComplete: (() => void) | undefined;

    const rogueDownstream = new ApolloLink(() => {
      return new Observable(observer => {
        emitNext = v => observer.next(v);
        emitError = e => observer.error(e);
        emitComplete = () => observer.complete();
      });
    });

    const link = ApolloLink.from([createTimeoutLink({ defaultTimeoutMs: 1000 }), rogueDownstream]);

    const nextSpy = vi.fn();
    const completeSpy = vi.fn();
    let errorCallCount = 0;

    runLink(link, { query: TEST_QUERY }).subscribe({
      next: nextSpy,
      error: () => {
        errorCallCount++;
      },
      complete: completeSpy,
    });

    vi.advanceTimersByTime(1000);
    expect(errorCallCount).toBe(1);

    // Rogue emissions after timeout
    emitNext?.({ data: { test: 'late' } });
    emitError?.(new Error('Late error'));
    emitComplete?.();

    expect(nextSpy).not.toHaveBeenCalled();
    expect(errorCallCount).toBe(1);
    expect(completeSpy).not.toHaveBeenCalled();
  });
});
