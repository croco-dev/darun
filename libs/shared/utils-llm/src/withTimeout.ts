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

/** Abort the actual transport and wait for settlement before a retry can start. */
export async function withAbortableStage<T>(
  run: (signal: AbortSignal) => Promise<T>,
  options: AbortableStageOptions
): Promise<T> {
  const { budgetMs, signal, message } = options;
  if (!Number.isFinite(budgetMs) || budgetMs <= 0)
    throw new Error('withAbortableStage requires a finite positive budgetMs');
  if (signal?.aborted) throw new AbortError(message);
  const controller = new AbortController();
  let timedOut = false;
  const onParentAbort = () => controller.abort();
  signal?.addEventListener('abort', onParentAbort, { once: true });
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, budgetMs);
  try {
    const value = await run(controller.signal);
    if (signal?.aborted) throw new AbortError(message);
    if (timedOut) throw new RetryableError(message);
    return value;
  } catch (error) {
    if (signal?.aborted) throw new AbortError(message);
    if (timedOut) throw new RetryableError(message);
    throw error;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onParentAbort);
  }
}
