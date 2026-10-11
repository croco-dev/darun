import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RetryableError, withRetry } from '../withRetry';
import { withTimeout } from '../withTimeout';

describe('withTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves when the promise settles before timeout', async () => {
    const promise = new Promise<string>(resolve => {
      setTimeout(() => resolve('success'), 100);
    });

    const resultPromise = withTimeout(promise, 500, 'Timed out');
    await vi.advanceTimersByTimeAsync(100);

    await expect(resultPromise).resolves.toBe('success');
  });

  it('rejects with timeout message when the promise takes too long', async () => {
    const promise = new Promise<string>(() => {
      // never resolves
    });

    const resultPromise = withTimeout(promise, 500, 'Custom timeout error');
    const assertion = expect(resultPromise).rejects.toThrow('Custom timeout error');

    await vi.advanceTimersByTimeAsync(500);
    await assertion;
  });

  it('rejects with a retryable error so withRetry retries timeouts', async () => {
    const promise = new Promise<string>(() => {
      // never resolves
    });

    const resultPromise = withTimeout(promise, 500, 'LLM 번역 요청이 시간 초과되었습니다.');
    const assertion = expect(resultPromise).rejects.toMatchObject({
      name: 'RetryableError',
      message: 'LLM 번역 요청이 시간 초과되었습니다.',
    });

    await vi.advanceTimersByTimeAsync(500);
    await assertion;
  });

  it('rejects with RetryableError instance on timeout', async () => {
    const promise = new Promise<string>(() => {
      // never resolves
    });

    const resultPromise = withTimeout(promise, 500, 'Custom timeout error');
    const assertion = expect(resultPromise).rejects.toBeInstanceOf(RetryableError);

    await vi.advanceTimersByTimeAsync(500);
    await assertion;
  });

  it('withRetry retries a timed-out call and then succeeds', async () => {
    const fn = vi
      .fn()
      .mockImplementationOnce(
        () => withTimeout(new Promise<string>(() => {}), 500, 'LLM 번역 요청이 시간 초과되었습니다.')
      )
      .mockResolvedValueOnce('ok');

    const result = withRetry(fn, { baseDelay: 1000, maxDelay: 1000 });
    const assertion = expect(result).resolves.toBe('ok');

    await vi.advanceTimersByTimeAsync(1500);
    await assertion;
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('clears timeout timer on promise rejection', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const promise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('immediate failure')), 50);
    });

    const resultPromise = withTimeout(promise, 500, 'Timed out');
    const assertion = expect(resultPromise).rejects.toThrow('immediate failure');

    await vi.advanceTimersByTimeAsync(50);
    await assertion;

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
