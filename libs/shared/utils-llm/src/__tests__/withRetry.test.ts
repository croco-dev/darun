import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RetryableError, withRetry } from '../withRetry';

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('Retry-After 헤더가 있으면 지정된 시간 후 재시도한다', async () => {
    const error = new RetryableError('rate limited', 429, {
      headers: { 'retry-after': '2' },
    });
    const fn = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('ok');

    const result = withRetry(fn, { baseDelay: 1000 });
    await vi.advanceTimersByTimeAsync(1999);

    expect(fn).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);

    await expect(result).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('Retry-After 헤더가 없으면 기존 지수 백오프를 사용한다', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new RetryableError('rate limited', 429)).mockResolvedValueOnce('ok');

    const result = withRetry(fn, { baseDelay: 1000 });
    await vi.advanceTimersByTimeAsync(999);

    expect(fn).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);

    await expect(result).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('429가 아닌 4xx 오류는 즉시 실패한다', async () => {
    const error = new RetryableError('bad request', 400);
    const fn = vi.fn().mockRejectedValue(error);

    await expect(withRetry(fn)).rejects.toBe(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('5xx 오류는 재시도한다', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new RetryableError('server error', 500)).mockResolvedValueOnce('ok');

    const result = withRetry(fn, { baseDelay: 1000 });

    await vi.advanceTimersByTimeAsync(1000);

    await expect(result).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
