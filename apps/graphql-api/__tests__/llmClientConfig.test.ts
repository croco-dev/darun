import 'reflect-metadata';

import { LlmSettingService } from '@darun/translation-service';
import { BraveSearchClient, LlmClient } from '@darun/utils-llm';
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

describe('BraveSearchClient container configuration', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    Container.remove(BraveSearchClient);
    Container.remove(LlmSettingService);
    globalThis.fetch = originalFetch;
    delete process.env['BRAVE_API_KEY'];
  });

  it('resolves BraveSearchClient and falls back safely to env when LlmSettingService fails', async () => {
    process.env['BRAVE_API_KEY'] = 'env-fallback-brave-key';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ web: { results: [] } }),
    });
    globalThis.fetch = fetchMock;

    Container.set({
      id: BraveSearchClient,
      factory: (container: ContainerInstance) =>
        new BraveSearchClient(async () => {
          try {
            const config = await container.get(LlmSettingService).getConfig();
            return config.braveApiKey || process.env['BRAVE_API_KEY'] || undefined;
          } catch {
            return process.env['BRAVE_API_KEY'] || undefined;
          }
        }),
    });

    const client = Container.get(BraveSearchClient);
    expect(client).toBeInstanceOf(BraveSearchClient);

    await client.search('test query');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers['X-Subscription-Token']).toBe('env-fallback-brave-key');
  });

  it('resolves BraveSearchClient with dynamic DB setting when LlmSettingService succeeds', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ web: { results: [] } }),
    });
    globalThis.fetch = fetchMock;

    const mockSettingService = {
      getConfig: vi.fn().mockResolvedValue({
        endpoint: 'https://openrouter.ai/api/v1',
        apiKey: 'custom-key',
        model: 'custom-model',
        thinkingLevel: 'low',
        braveApiKey: 'db-brave-key',
      }),
    };

    Container.set(LlmSettingService, mockSettingService as unknown as LlmSettingService);

    Container.set({
      id: BraveSearchClient,
      factory: (container: ContainerInstance) =>
        new BraveSearchClient(async () => {
          try {
            const config = await container.get(LlmSettingService).getConfig();
            return config.braveApiKey || process.env['BRAVE_API_KEY'] || undefined;
          } catch {
            return process.env['BRAVE_API_KEY'] || undefined;
          }
        }),
    });

    const client = Container.get(BraveSearchClient);
    expect(client).toBeInstanceOf(BraveSearchClient);

    await client.search('test query');
    expect(mockSettingService.getConfig).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers['X-Subscription-Token']).toBe('db-brave-key');
  });
});
