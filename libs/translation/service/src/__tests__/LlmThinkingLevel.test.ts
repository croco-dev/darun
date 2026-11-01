import type { LlmSetting, LlmSettingRepository } from '@darun/translation-domain';
import { LlmClient, type LlmConfig } from '@darun/utils-llm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LlmSettingService } from '../LlmSettingService';

const messages = [{ role: 'user' as const, content: '합성 요청' }];
const config = {
  endpoint: 'https://openrouter.ai/api/v1',
  apiKey: 'synthetic-stored-key',
  model: 'synthetic-model',
};

function setup(thinkingLevel: string | null = 'low', hasRow = true, endpoint = config.endpoint) {
  let setting: LlmSetting | null = hasRow
    ? {
        id: 'default',
        ...config,
        endpoint,
        thinkingLevel,
        braveApiKey: null,
        createdAt: new Date('2026-10-29T00:00:00Z'),
        updatedAt: new Date('2026-10-29T00:00:00Z'),
      }
    : null;
  const repository: LlmSettingRepository = {
    findSetting: async () => setting,
    updateSetting: async modify => {
      setting = {
        id: 'default',
        createdAt: new Date('2026-10-29T00:00:00Z'),
        updatedAt: new Date('2026-10-29T00:00:00Z'),
        ...modify(setting),
      };
      return setting;
    },
  };
  const service = new LlmSettingService(repository);
  return { service, client: new LlmClient(service) };
}

describe('저장한 추론 강도와 실제 completion 요청', () => {
  const transport = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv('OPEN_ROUTER_API_KEY', 'synthetic-environment-key');
    vi.stubEnv('OPEN_ROUTER_ENDPOINT', config.endpoint);
    vi.stubEnv('OPEN_ROUTER_MODEL', config.model);
    vi.stubEnv('OPEN_ROUTER_THINKING_LEVEL', 'high');
    vi.stubGlobal('fetch', transport);
    transport.mockReset();
    transport.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                finish_reason: 'stop',
                message: { role: 'assistant', content: '완료' },
              },
            ],
          }),
          { headers: { 'content-type': 'application/json' } }
        )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function expectRequestLevel(level: string | null) {
    expect(transport).toHaveBeenCalledTimes(1);
    const [url, init] = transport.mock.calls[0]!;
    expect(String(url)).toBe('https://openrouter.ai/api/v1/chat/completions');
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe('synthetic-model');
    expect(body.messages).toEqual(messages);
    if (level === null) {
      expect(body).not.toHaveProperty('reasoning');
      expect(body).not.toHaveProperty('reasoning_effort');
    } else {
      expect(body.reasoning).toEqual({ effort: level });
      if (['low', 'medium', 'high'].includes(level)) expect(body.reasoning_effort).toBe(level);
      else expect(body).not.toHaveProperty('reasoning_effort');
    }
  }

  it.each(['', null])('모델 기본값 저장은 환경 high를 되살리지 않는다: %s', async thinkingLevel => {
    const { service, client } = setup();

    expect((await service.updateSetting({ thinkingLevel })).thinkingLevel).toBeNull();
    expect((await service.getSetting()).thinkingLevel).toBeNull();
    expect((await service.getConfig()).thinkingLevel).toBeNull();
    expect((await client.getConfig()).thinkingLevel).toBeNull();
    await client.completion(messages);

    expectRequestLevel(null);
    expect(new Headers(transport.mock.calls[0]![1]?.headers).get('authorization')).toBe('Bearer synthetic-stored-key');
  });

  it('다른 설정만 저장해도 기존 모델 기본값을 유지한다', async () => {
    const { service, client } = setup(null);

    await service.updateSetting({ braveApiKey: 'synthetic-search-key' });
    await client.completion(messages);

    expect((await service.getSetting()).thinkingLevel).toBeNull();
    expectRequestLevel(null);
  });

  it.each(['low', 'medium', 'high', 'none', 'minimal', 'xhigh', 'max'])(
    '명시한 강도는 저장과 전송에서 유지한다: %s',
    async thinkingLevel => {
      const { service, client } = setup(null);

      await service.updateSetting({ thinkingLevel: ` ${thinkingLevel} ` });
      expect((await service.getSetting()).thinkingLevel).toBe(thinkingLevel);
      await client.completion(messages);

      expectRequestLevel(thinkingLevel);
    }
  );

  it.each(['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'])(
    '표준 엔드포인트에 저장한 강도를 reasoning_effort로 전송한다: %s',
    async thinkingLevel => {
      const { service, client } = setup(null, true, 'https://api.openai.com/v1');

      await service.updateSetting({ thinkingLevel: ` ${thinkingLevel} ` });
      expect((await service.getSetting()).thinkingLevel).toBe(thinkingLevel);
      await client.completion(messages);

      expect(transport).toHaveBeenCalledTimes(1);
      const [url, init] = transport.mock.calls[0]!;
      expect(String(url)).toBe('https://api.openai.com/v1/chat/completions');
      const body = JSON.parse(String(init?.body));
      expect(body.reasoning_effort).toBe(thinkingLevel);
      expect(body).not.toHaveProperty('reasoning');
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer synthetic-stored-key');
    }
  );

  it.each(['high', undefined])('설정 행이 없으면 환경 기본 구성을 사용한다: %s', async envLevel => {
    vi.stubEnv('OPEN_ROUTER_THINKING_LEVEL', envLevel);
    const { service, client } = setup(null, false);

    expect((await service.getSetting()).thinkingLevel).toBe(envLevel ?? null);
    expect((await client.getConfig()).thinkingLevel).toBe(envLevel ?? null);
    await client.completion(messages);

    expectRequestLevel(envLevel ?? null);
  });

  it.each(['high', undefined])('provider가 없으면 환경 기본 구성을 사용한다: %s', async envLevel => {
    vi.stubEnv('OPEN_ROUTER_THINKING_LEVEL', envLevel);
    const client = new LlmClient();

    expect((await client.getConfig()).thinkingLevel).toBe(envLevel ?? null);
    await client.completion(messages);

    expectRequestLevel(envLevel ?? null);
  });

  it.each([
    { providerConfig: { ...config, thinkingLevel: null }, expected: null },
    { providerConfig: config, expected: 'high' },
  ])('provider의 명시적 null과 생략을 구분한다: $expected', async ({ providerConfig, expected }) => {
    const client = new LlmClient({
      getConfig: async (): Promise<LlmConfig> => providerConfig,
    });

    expect((await client.getConfig()).thinkingLevel).toBe(expected);
    await client.completion(messages);

    expectRequestLevel(expected);
  });

  it.each([null, 'low', 'medium', 'high', 'none'])(
    '호출별 강도는 저장한 강도보다 우선한다: %s',
    async thinkingLevel => {
      const { client } = setup('medium');

      await client.completion('synthetic-model', messages, { thinkingLevel });

      expectRequestLevel(thinkingLevel);
    }
  );
});
