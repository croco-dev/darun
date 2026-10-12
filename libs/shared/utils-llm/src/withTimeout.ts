import { AbortError, RetryableError } from './withRetry';

export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new RetryableError(message)), ms);
  });
  return Promise.race([
    promise.finally(() => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }),
    timeout,
  ]);
}

export type AbortableStageOptions = {
  /** Stage wall-clock budget in milliseconds. Must be finite and positive. */
  budgetMs: number;
  /** Parent signal (worker deadline). Linked, never swallowed. */
  signal?: AbortSignal;
  message: string;
};

/**
 * Stage wall-clock budget with AbortSignal propagation. Rejects with
 * RetryableError on budget expiry (retryable class) and AbortError when the
 * parent signal fires (caller intent, never retried). The wrapped promise
 * must honor `signal` for actual cancellation at the HTTP layer.
 */
export function withAbortableStage<T>(
  run: (signal: AbortSignal) => Promise<T>,
  options: AbortableStageOptions
): Promise<T> {
  const { budgetMs, signal, message } = options;
  if (!Number.isFinite(budgetMs) || budgetMs <= 0) {
    throw new Error('withAbortableStage requires a finite positive budgetMs');
  }
  if (signal?.aborted) {
    return Promise.reject(new AbortError(message));
  }
  const controller = new AbortController();
  const onParentAbort = () => controller.abort();
  if (signal) {
    signal.addEventListener('abort', onParentAbort, { once: true });
  }
  const cleanup = () => {
    signal?.removeEventListener('abort', onParentAbort);
  };
  let timeoutId: NodeJS.Timeout | undefined;
  const budget = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new RetryableError(message));
    }, budgetMs);
  });
  const attempt = run(controller.signal).then(
    value => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      cleanup();
      return value;
    },
    error => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      cleanup();
      if (signal?.aborted || controller.signal.aborted) {
        throw new AbortError(error instanceof Error ? error.message : message);
      }
      throw error;
    }
  );
  return Promise.race([attempt, budget]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    cleanup();
  });
}
