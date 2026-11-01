// @vitest-environment node
import { APIUserAbortError } from 'openai/error';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LlmClient } from '../libs/LlmClient';

const messages = [{ role: 'user' as const, content: 'Synthetic reasoning request' }];
const endpoints = ['https://api.openai.com/v1', 'https://custom.example/v1', 'https://openrouter.ai/api/v1'];
const levels = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];
const responseFormat = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'synthetic_result',
    strict: true,
    schema: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
};

describe('provider reasoning request JSON through the installed OpenAI SDK', () => {
  const transport = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv('OPEN_ROUTER_API_KEY', 'synthetic-environment-key');
    vi.stubEnv('OPEN_ROUTER_THINKING_LEVEL', 'high');
    vi.stubGlobal('fetch', transport);
    transport.mockReset();
    transport.mockImplementation(async () =>
      Response.json({
        choices: [
          {
            finish_reason: 'stop',
            message: { role: 'assistant', content: '{}' },
          },
        ],
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function clientFor(endpoint: string, thinkingLevel: string | null | undefined) {
    return new LlmClient({
      getConfig: async () => ({
        endpoint,
        apiKey: 'synthetic-provider-key',
        model: 'synthetic-model',
        thinkingLevel,
      }),
    });
  }

  function requestBody() {
    expect(transport).toHaveBeenCalledTimes(1);
    return JSON.parse(String(transport.mock.calls[0]![1]?.body));
  }

  describe.each(endpoints)('%s', endpoint => {
    it.each(levels)('preserves the selected effort without provider field leakage: %s', async level => {
      await clientFor(endpoint, ` ${level} `).completion(messages, undefined, { responseFormat });

      const body = requestBody();
      expect(body.model).toBe('synthetic-model');
      expect(body.messages).toEqual(messages);
      expect(body.response_format).toEqual(responseFormat);
      expect(String(transport.mock.calls[0]![0])).toBe(`${endpoint}/chat/completions`);
      expect(new Headers(transport.mock.calls[0]![1]?.headers).get('authorization')).toBe(
        'Bearer synthetic-provider-key'
      );
      if (endpoint === 'https://openrouter.ai/api/v1') {
        expect(body.reasoning).toEqual({ effort: level });
        expect(body.provider).toEqual({ require_parameters: true });
        if (['low', 'medium', 'high'].includes(level)) expect(body.reasoning_effort).toBe(level);
        else expect(body).not.toHaveProperty('reasoning_effort');
      } else {
        expect(body.reasoning_effort).toBe(level);
        expect(body).not.toHaveProperty('reasoning');
        expect(body).not.toHaveProperty('provider');
      }
    });

    it.each([null, '', '   '])('omits effort for model defaults despite an environment high: %s', async level => {
      await clientFor(endpoint, level).completion(messages);
      expect(requestBody()).not.toHaveProperty('reasoning');
      expect(requestBody()).not.toHaveProperty('reasoning_effort');
    });

    it('uses environment effort only when the provider omits it', async () => {
      await clientFor(endpoint, undefined).completion(messages);
      const body = requestBody();
      expect(body.reasoning_effort).toBe('high');
      if (endpoint === 'https://openrouter.ai/api/v1') expect(body.reasoning).toEqual({ effort: 'high' });
      else expect(body).not.toHaveProperty('reasoning');
    });

    it.each([null, 'minimal'])('honors a per-call override of stored high: %s', async thinkingLevel => {
      await clientFor(endpoint, 'high').completion('explicit-model', messages, { thinkingLevel });
      const body = requestBody();
      expect(body.model).toBe('explicit-model');
      if (thinkingLevel === null) {
        expect(body).not.toHaveProperty('reasoning');
        expect(body).not.toHaveProperty('reasoning_effort');
      } else if (endpoint === 'https://openrouter.ai/api/v1') {
        expect(body.reasoning).toEqual({ effort: 'minimal' });
      } else {
        expect(body.reasoning_effort).toBe('minimal');
        expect(body).not.toHaveProperty('reasoning');
      }
    });

    it.each(['turbo', 'HIGH'])('rejects an unsupported effort before sending: %s', async thinkingLevel => {
      await expect(clientFor(endpoint, thinkingLevel).completion(messages)).rejects.toThrow('지원하지 않는 추론 강도');
      expect(transport).not.toHaveBeenCalled();
    });

    it('does not send a request when the caller already aborted', async () => {
      const controller = new AbortController();
      controller.abort();
      await expect(
        clientFor(endpoint, 'max').completion(messages, undefined, {
          signal: controller.signal,
        })
      ).rejects.toMatchObject({ name: 'AbortError' });
      expect(transport).not.toHaveBeenCalled();
    });

    it('propagates caller cancellation to an in-flight SDK request without retrying', async () => {
      const controller = new AbortController();
      transport.mockImplementationOnce(async (_url, init) => {
        expect(init?.signal?.aborted).toBe(false);
        controller.abort();
        expect(init?.signal?.aborted).toBe(true);
        throw new DOMException('Synthetic abort', 'AbortError');
      });
      await expect(
        clientFor(endpoint, 'high').completion(messages, undefined, {
          signal: controller.signal,
        })
      ).rejects.toBeInstanceOf(APIUserAbortError);
      expect(transport).toHaveBeenCalledTimes(1);
    });
  });
});
