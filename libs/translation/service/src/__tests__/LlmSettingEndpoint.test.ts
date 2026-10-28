import type { LlmSetting, LlmSettingRepository } from '@darun/translation-domain';
import { LlmClient } from '@darun/utils-llm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LlmSettingService } from '../LlmSettingService';

const base = 'https://provider.example/v1';
const storedKey = 'synthetic-provider-credential';

function setup(endpoint: string) {
  let setting: LlmSetting = {
    id: 'default',
    endpoint,
    apiKey: storedKey,
    model: 'synthetic-model',
    thinkingLevel: null,
    braveApiKey: null,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  };
  const repository: LlmSettingRepository = {
    findSetting: async () => setting,
    updateSetting: async modify => {
      setting = { ...setting, ...modify(setting) };
      return setting;
    },
  };
  const service = new LlmSettingService(repository);
  return { service, client: new LlmClient(service) };
}

describe('LLM 설정 저장과 completion의 엔드포인트 일치', () => {
  const transport = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv('OPEN_ROUTER_API_KEY', 'synthetic-environment-credential');
    vi.stubGlobal('fetch', transport);
    transport.mockReset();
    transport.mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: '완료' } }],
        }),
        { headers: { 'content-type': 'application/json' } }
      )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it.each([
    [base, `${base}/`, base],
    [base, ` ${base}/models/// `, base],
    [`${base}/models/`, base, base],
    [`${base}/models/`, undefined, base],
    [`${base}/models/models`, `${base}/models/models/`, `${base}/models`],
    ['https://openrouter.ai/api/v1', 'https://openrouter.ai/api/v1/models/', 'https://openrouter.ai/api/v1'],
  ])('같은 base의 표기 변경은 키를 보존한다: %s → %s', async (current, endpoint, expectedBase) => {
    const { service, client } = setup(current!);

    const saved = await service.updateSetting({ endpoint });

    expect(saved.apiKey === storedKey).toBe(true);
    expect(saved.endpoint).toBe(endpoint?.trim() || current);
    expect((await service.getSetting()).endpoint).toBe(saved.endpoint);
    expect((await client.getConfig()).endpoint).toBe(expectedBase);
    await expect(client.completion([{ role: 'user', content: '합성 요청' }])).resolves.toMatchObject({
      content: '완료',
    });
    expect(transport).toHaveBeenCalledTimes(1);
    const [url, init] = transport.mock.calls[0]!;
    expect(String(url)).toBe(`${expectedBase}/chat/completions`);
    expect(new Headers(init?.headers).get('authorization') === `Bearer ${storedKey}`).toBe(true);
  });

  it.each([
    'https://other.example/v1/',
    'https://provider.example/v2/models',
    `${base}/models/other`,
    `${base}/models/models`,
  ])('실제 base가 바뀌면 이전 키를 지우고 completion을 전송하지 않는다: %s', async endpoint => {
    const { service, client } = setup(`${base}/models/`);

    const saved = await service.updateSetting({ endpoint });

    expect(saved.apiKey).toBeNull();
    expect((await client.getConfig()).apiKey).toBe('');
    await expect(client.completion([])).rejects.toThrow('API key is not provided');
    expect(transport).not.toHaveBeenCalled();
  });

  it.each([null, '', '   '])('같은 base라도 명시적 키 삭제를 적용한다: %s', async apiKey => {
    const { service, client } = setup(base);

    const saved = await service.updateSetting({ endpoint: `${base}/models/`, apiKey });

    expect(saved.endpoint).toBe(`${base}/models/`);
    expect(saved.apiKey).toBeNull();
    expect((await client.getConfig()).apiKey).toBe('');
    await expect(client.completion([])).rejects.toThrow('API key is not provided');
    expect(transport).not.toHaveBeenCalled();
  });

  it('정규화한 커스텀 base에도 환경 기본 키 저장을 거절한다', async () => {
    const { service } = setup(base);

    await expect(
      service.updateSetting({ endpoint: `${base}/models/`, apiKey: process.env['OPEN_ROUTER_API_KEY'] })
    ).rejects.toMatchObject({ code: 'LLM_API_KEY_NOT_ALLOWED' });
    expect((await service.getSetting()).apiKey === storedKey).toBe(true);
    expect(transport).not.toHaveBeenCalled();
  });
});
