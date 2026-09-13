import 'reflect-metadata';

import { LlmSettingService } from '@darun/translation-service';
import { LlmClient } from '@darun/utils-llm';
import { Container, type ContainerInstance } from 'typedi';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('LlmClient container configuration', () => {
  afterEach(() => {
    Container.remove(LlmClient);
    Container.remove(LlmSettingService);
  });

  it('resolves LlmClient and falls back safely when LlmSettingService fails', async () => {
    Container.set({
      id: LlmClient,
      factory: (container: ContainerInstance) =>
        new LlmClient({
          getConfig: async () => {
            try {
              return await container.get(LlmSettingService).getConfig();
            } catch {
              return {
                endpoint: 'https://openrouter.ai/api/v1',
                apiKey: 'fallback-key',
                model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
                thinkingLevel: null,
              };
            }
          },
        }),
    });

    const client = Container.get(LlmClient);
    expect(client).toBeInstanceOf(LlmClient);

    const config = await client.getConfig();
    expect(config.apiKey).toBe('fallback-key');
    expect(config.model).toBe('nvidia/nemotron-3-ultra-550b-a55b:free');
  });

  it('resolves LlmClient with custom settings when LlmSettingService succeeds', async () => {
    const mockSettingService = {
      getConfig: vi.fn().mockResolvedValue({
        endpoint: 'https://custom-llm.com/v1',
        apiKey: 'custom-key',
        model: 'custom-model',
        thinkingLevel: 'low',
      }),
    };

    Container.set(LlmSettingService, mockSettingService as unknown as LlmSettingService);

    Container.set({
      id: LlmClient,
      factory: (container: ContainerInstance) =>
        new LlmClient({
          getConfig: async () => {
            try {
              return await container.get(LlmSettingService).getConfig();
            } catch {
              return {
                endpoint: 'https://openrouter.ai/api/v1',
                apiKey: 'fallback-key',
                model: 'fallback-model',
                thinkingLevel: null,
              };
            }
          },
        }),
    });

    const client = Container.get(LlmClient);
    const config = await client.getConfig();

    expect(config.endpoint).toBe('https://custom-llm.com/v1');
    expect(config.apiKey).toBe('custom-key');
    expect(config.model).toBe('custom-model');
    expect(config.thinkingLevel).toBe('low');
  });
});
