import { ApolloLink, Observable } from '@apollo/client';

export const DEFAULT_APOLLO_TIMEOUT_MS = 15000;

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

export function isTimeoutOrAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as { name?: string; message?: string; networkError?: unknown };

  if (err.name === 'TimeoutError' || err.name === 'AbortError') {
    return true;
  }

  if (typeof err.message === 'string') {
    const lower = err.message.toLowerCase();
    if (lower.includes('timed out') || lower.includes('timeout') || lower.includes('aborted')) {
      return true;
    }
  }

  if (err.networkError) {
    return isTimeoutOrAbortError(err.networkError);
  }

  return false;
}

export interface OperationLike {
  query?: {
    definitions?: ReadonlyArray<{ kind: string; operation?: string }>;
  };
}

export function shouldRetryOperation(error: unknown, operation?: OperationLike): boolean {
  if (isTimeoutOrAbortError(error)) {
    return false;
  }

  if (operation?.query?.definitions) {
    const isMutation = operation.query.definitions.some(
      definition => definition?.kind === 'OperationDefinition' && definition.operation === 'mutation'
    );
    if (isMutation) {
      return false;
    }
  }

  return !!error;
}

export interface TimeoutLinkOptions {
  defaultTimeoutMs?: number;
}

export function createTimeoutLink(options: TimeoutLinkOptions = {}): ApolloLink {
  const defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_APOLLO_TIMEOUT_MS;

  return new ApolloLink((operation, forward) => {
    const context = operation.getContext();
    const rawTimeout = context.timeout;
    const timeoutMs: number =
      typeof rawTimeout === 'number' && Number.isFinite(rawTimeout)
        ? rawTimeout
        : defaultTimeoutMs;

    if (timeoutMs <= 0) {
      return forward(operation);
    }

    return new Observable(observer => {
      const currentContext = operation.getContext();
      const rawFetchOptions = (currentContext.fetchOptions || {}) as Record<string, unknown>;

      const upstreamSignal = (
        '__darunOriginalSignal' in currentContext
          ? currentContext.__darunOriginalSignal
          : rawFetchOptions.signal
      ) as AbortSignal | undefined;

      if (upstreamSignal?.aborted) {
        const abortReason =
          upstreamSignal.reason ??
          new DOMException('This operation was aborted', 'AbortError');
        observer.error(abortReason);
        return;
      }

      const controller = new AbortController();
      let isTimedOut = false;
      let isCompleted = false;
      const subscriptionRef: { current?: { unsubscribe: () => void } } = {};

      let abortListener: (() => void) | undefined;

      const cleanupTimerAndListener = () => {
        clearTimeout(timeoutId);
        if (upstreamSignal && abortListener) {
          upstreamSignal.removeEventListener('abort', abortListener);
          abortListener = undefined;
        }
      };

      const restoreOriginalSignal = () => {
        const ctx = operation.getContext();
        operation.setContext({
          fetchOptions: {
            ...(ctx.fetchOptions as Record<string, unknown> | undefined),
            signal: upstreamSignal,
          },
        });
      };

      const timeoutId = setTimeout(() => {
        isTimedOut = true;
        cleanupTimerAndListener();
        const timeoutError = new TimeoutError(
          `GraphQL operation '${operation.operationName || 'unnamed'}' timed out after ${timeoutMs}ms`
        );
        controller.abort(timeoutError);
        subscriptionRef.current?.unsubscribe();
        subscriptionRef.current = undefined;
        restoreOriginalSignal();
        observer.error(timeoutError);
      }, timeoutMs);

      if (upstreamSignal) {
        abortListener = () => {
          cleanupTimerAndListener();
          controller.abort(upstreamSignal.reason);
        };
        upstreamSignal.addEventListener('abort', abortListener, { once: true });
      }

      operation.setContext({
        __darunOriginalSignal: upstreamSignal,
        fetchOptions: {
          ...rawFetchOptions,
          signal: controller.signal,
        },
      });

      try {
        subscriptionRef.current = forward(operation).subscribe({
          next: val => {
            if (!isTimedOut) {
              observer.next(val);
            }
          },
          error: err => {
            if (isCompleted || isTimedOut) {
              return;
            }
            isCompleted = true;
            cleanupTimerAndListener();
            restoreOriginalSignal();
            observer.error(err);
          },
          complete: () => {
            if (isCompleted || isTimedOut) {
              return;
            }
            isCompleted = true;
            cleanupTimerAndListener();
            restoreOriginalSignal();
            observer.complete();
          },
        });
      } catch (syncErr) {
        cleanupTimerAndListener();
        controller.abort(syncErr);
        restoreOriginalSignal();
        observer.error(syncErr);
      }

      return () => {
        cleanupTimerAndListener();
        if (!isCompleted && !isTimedOut) {
          controller.abort();
        }
        subscriptionRef.current?.unsubscribe();
        subscriptionRef.current = undefined;
        restoreOriginalSignal();
      };
    });
  });
}
