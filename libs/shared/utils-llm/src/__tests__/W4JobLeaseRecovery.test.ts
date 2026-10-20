import { describe, expect, it, vi } from 'vitest';
import { AbortError, isAbortError, RetryableError, withRetry } from '../withRetry';
import { withAbortableStage, withTimeout } from '../withTimeout';

describe('W4 job lease recovery: AbortSignal + stage budget + retryable classes', () => {
  it('W4-A4: propagates AbortSignal to the HTTP layer and maps parent abort to AbortError', async () => {
    const seen: Array<AbortSignal | undefined> = [];
    const run = vi.fn((signal: AbortSignal) => {
      seen.push(signal);
      return new Promise<string>((_, reject) => {
        signal.addEventListener('abort', () => {
          const aborted = new Error('fetch aborted');
          aborted.name = 'AbortError';
          reject(aborted);
        });
      });
    });
    const parent = new AbortController();
    const pending = withAbortableStage(run, { budgetMs: 5_000, signal: parent.signal, message: 'stage timeout' });
    const assertion = expect(pending).rejects.toBeInstanceOf(AbortError);
    parent.abort();
    await assertion;
    expect(run).toHaveBeenCalledTimes(1);
    expect(seen[0]).toBeInstanceOf(AbortSignal);
  });

  it('W4-A4: stage budget expiry is retryable but parent abort is never retried', async () => {
    // Budget expiry -> RetryableError -> retried by withRetry.
    const flaky = vi
      .fn<() => Promise<string>>()
      .mockImplementationOnce(() => withTimeout(new Promise<string>(() => {}), 10, 'stage timeout'))
      .mockResolvedValueOnce('ok');
    await expect(withRetry(flaky, { baseDelay: 1, maxDelay: 1 })).resolves.toBe('ok');
    expect(flaky).toHaveBeenCalledTimes(2);

    // Parent abort -> AbortError -> never retried.
    const aborted = vi.fn<() => Promise<string>>().mockRejectedValueOnce(new AbortError('aborted'));
    await expect(withRetry(aborted, { baseDelay: 1, maxDelay: 1 })).rejects.toBeInstanceOf(AbortError);
    expect(aborted).toHaveBeenCalledTimes(1);
    expect(isAbortError(new RetryableError('timeout'))).toBe(false);
  });

  it('W4-A4: retries are limited to retryable classes (4xx non-429 never retried)', async () => {
    const badRequest = vi.fn<() => Promise<string>>().mockRejectedValueOnce(new RetryableError('bad', 400));
    await expect(withRetry(badRequest, { baseDelay: 1, maxDelay: 1 })).rejects.toMatchObject({ statusCode: 400 });
    expect(badRequest).toHaveBeenCalledTimes(1);

    const rateLimited = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new RetryableError('limited', 429))
      .mockResolvedValueOnce('ok');
    await expect(withRetry(rateLimited, { baseDelay: 1, maxDelay: 1 })).resolves.toBe('ok');
    expect(rateLimited).toHaveBeenCalledTimes(2);
  });
});
