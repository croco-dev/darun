import 'reflect-metadata';
import { LlmSettingService } from '@darun/translation-service';
import { LlmClient } from '@darun/utils-llm';
import { Container } from 'typedi';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/sentry', () => ({}));
vi.mock('../src/config/firebase', () => ({}));
vi.mock('../src/config/storage', () => ({}));

const findSetting = vi.fn();

describe('actual application LlmClient factory', () => {
  beforeEach(async () => {
    vi.stubEnv('INFRA_ENV', 'local');
    vi.stubEnv('RUNNING_ENV', 'local');
    vi.stubEnv('DATABASE_URL', 'postgres://fixture:fixture@127.0.0.1:55435/darun_content_integrity');
    vi.stubEnv('MONGODB_URI', 'mongodb://127.0.0.1:27018/darun_content_integrity');
    vi.stubEnv('FIREBASE_PROJECT_ID', 'darun-local');
    vi.stubEnv('VOTE_IP_SALT', 'synthetic-fixture-only');
    vi.stubEnv('OPEN_ROUTER_API_KEY', 'environment-key');
    vi.stubEnv('OPEN_ROUTER_ENDPOINT', 'https://openrouter.ai/api/v1');
    // Exercise production registration after isolated environment setup; a static import runs too early.
    await import('../src/config');
    // Vitest's esbuild transform omits constructor metadata; the Lambda smoke covers DI construction.
    Container.set(LlmSettingService, new LlmSettingService({ findSetting, upsertSetting: vi.fn() }));
    findSetting.mockReset();
  });
  afterEach(() => {
    Container.remove(LlmSettingService);
    vi.unstubAllEnvs();
  });

  it('uses the stored provider key through the real service and DI factory', async () => {
    findSetting.mockResolvedValue({
      endpoint: 'https://custom.example.com/v1',
      apiKey: 'provider-key',
      model: 'stored-model',
    });
    expect(await Container.get(LlmClient).getConfig()).toMatchObject({
      endpoint: 'https://custom.example.com/v1',
      apiKey: 'provider-key',
      model: 'stored-model',
    });
  });
  it('does not combine a custom row without credentials with the environment key', async () => {
    findSetting.mockResolvedValue({ endpoint: 'https://custom.example.com/v1', apiKey: null, model: 'stored-model' });
    expect((await Container.get(LlmClient).getConfig()).apiKey).toBe('');
  });
  it('propagates a sanitized retryable config read failure rather than completing with another model', async () => {
    findSetting.mockRejectedValue(new Error('raw-secret-database-error'));
    const error = await Container.get(LlmClient)
      .getConfig()
      .catch((failure: unknown) => failure);
    expect(error).toMatchObject({ code: 'LLM_CONFIG_READ_FAILED', cause: undefined });
    expect(String(error)).not.toContain('raw-secret-database-error');
  });
});
