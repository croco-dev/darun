// @vitest-environment node

import { APIConnectionError, APIConnectionTimeoutError, APIUserAbortError } from 'openai/error';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LlmClient } from '../libs/LlmClient';
import { isAbortError, isRetryableError, withRetry } from '../withRetry';

const messages = [{ role: 'user' as const, content: 'Synthetic input' }];
const retryOptions = { maxRetries: 1, baseDelay: 0, maxDelay: 0 };

function client() {
  return new LlmClient({
    getConfig: async () => ({
      endpoint: 'https://synthetic.invalid/v1',
      apiKey: 'synthetic-key',
      model: 'fixture',
    }),
  });
}

function success() {
  return Response.json({
    choices: [
      {
        finish_reason: 'stop',
        message: { role: 'assistant', content: 'Recovered' },
      },
    ],
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LlmClient real SDK synthetic transport', () => {
  it('SDK 자체 재시도 없이 기본 status 없는 연결 오류를 전달한다', async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    vi.stubGlobal('fetch', fetch);
    const error = await client()
      .completion(messages)
      .catch(error => error);
    expect(error).toBeInstanceOf(APIConnectionError);
    expect(error.message).toBe('Connection error.');
    expect(error.status).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('연결 실패 다음 합성 성공을 바깥 bounded retry로 복구한다', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')).mockImplementationOnce(success);
    vi.stubGlobal('fetch', fetch);
    const llm = client();
    const complete = vi.fn(async () => {
      try {
        return await llm.completion(messages);
      } catch (error) {
        expect(error).toBeInstanceOf(APIConnectionError);
        expect(error).toMatchObject({
          message: 'Connection error.',
          status: undefined,
        });
        throw error;
      }
    });
    await expect(withRetry(complete, retryOptions)).resolves.toMatchObject({
      content: 'Recovered',
    });
    expect(complete).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('연결 오류가 계속되면 바깥 retry 상한에서 멈춘다', async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    vi.stubGlobal('fetch', fetch);
    const llm = client();
    const complete = vi.fn(() => llm.completion(messages));
    await expect(withRetry(complete, retryOptions)).rejects.toBeInstanceOf(APIConnectionError);
    expect(complete).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('SDK가 변환한 status 없는 연결 timeout도 복구한다', async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new DOMException('Synthetic transport deadline', 'AbortError'))
      .mockImplementationOnce(success);
    vi.stubGlobal('fetch', fetch);
    const llm = client();
    await expect(
      withRetry(async () => {
        try {
          return await llm.completion(messages);
        } catch (error) {
          expect(error).toBeInstanceOf(APIConnectionTimeoutError);
          expect(error).toMatchObject({
            message: 'Request timed out.',
            status: undefined,
          });
          throw error;
        }
      }, retryOptions)
    ).resolves.toMatchObject({ content: 'Recovered' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('실제 SDK caller abort는 연결 오류가 아니며 재시도하지 않는다', async () => {
    const controller = new AbortController();
    const fetch = vi.fn(async () => {
      controller.abort();
      throw new DOMException('Synthetic caller cancellation', 'AbortError');
    });
    vi.stubGlobal('fetch', fetch);
    const llm = client();
    const error = await withRetry(
      () => llm.completion('fixture', messages, { signal: controller.signal }),
      retryOptions
    ).catch(error => error);
    expect(error).toBeInstanceOf(APIUserAbortError);
    expect(isAbortError(error)).toBe(true);
    expect(isRetryableError(error)).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([400, 401, 403, 422])('실제 SDK HTTP %s는 연결 장애로 재시도하지 않는다', async status => {
    const fetch = vi.fn(async () => Response.json({ error: { message: 'Synthetic rejection' } }, { status }));
    vi.stubGlobal('fetch', fetch);
    const llm = client();
    await expect(withRetry(() => llm.completion(messages), retryOptions)).rejects.toMatchObject({ status });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
