import { APIConnectionError, APIConnectionTimeoutError, APIUserAbortError, APIError } from 'openai/error';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LlmEndpointKeyError } from '../libs/LlmEndpointKeyPolicy';
import { RetryableError, isRetryableError, withRetry } from '../withRetry';

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

  it.each([new APIConnectionError({}), new APIConnectionTimeoutError()])(
    'SDK 연결 오류 %s를 메시지가 아닌 class로 분류한다',
    async error => {
      expect(error.status).toBeUndefined();
      expect(isRetryableError(error)).toBe(true);
      const fn = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('ok');
      const result = withRetry(fn, { maxRetries: 1, baseDelay: 1000 });
      await vi.advanceTimersByTimeAsync(1000);
      await expect(result).resolves.toBe('ok');
      expect(fn).toHaveBeenCalledTimes(2);
    }
  );

  it.each([
    new APIUserAbortError(),
    ...[400, 401, 403, 422].map(status =>
      APIError.generate(status, { error: { message: 'rejected' } }, '', new Headers())
    ),
    new LlmEndpointKeyError(),
    new Error('invalid generation'),
    new Error('Connection error.'),
    Object.assign(new Error('unrelated failure'), {
      cause: new APIConnectionError({}),
    }),
  ])('비재시도 오류 %s와 임의 cause를 연결 장애로 분류하지 않는다', async error => {
    expect(isRetryableError(error)).toBe(false);
    const fn = vi.fn().mockRejectedValue(error);
    await expect(withRetry(fn)).rejects.toBe(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retry 상한을 소진하면 마지막 SDK 연결 오류를 전달한다', async () => {
    const first = new APIConnectionError({});
    const last = new APIConnectionTimeoutError();
    const fn = vi.fn().mockRejectedValueOnce(first).mockRejectedValue(last);
    const assertion = expect(withRetry(fn, { maxRetries: 1, baseDelay: 1000 })).rejects.toBe(last);
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
