import 'reflect-metadata';
import type { LlmSettingService } from '@darun/translation-service';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('typedi', () => ({
  Service: () => () => {},
}));

vi.mock('@darun/utils-apollo-server', () => ({
  AuthRole: { Admin: 'Admin' },
}));

vi.mock('type-graphql', () => {
  const methodDecorator = () => (_target: object, _key: string, descriptor: PropertyDescriptor) => descriptor;
  return {
    Arg: () => () => vi.fn(),
    Authorized: methodDecorator,
    Mutation: methodDecorator,
    Query: methodDecorator,
    ObjectType: () => () => {},
    Field: () => () => {},
    InputType: () => () => {},
    Resolver: () => () => {},
    ID: 'ID',
  };
});

import { LlmSettingResolver } from '../LlmSetting.resolver';

describe('LlmSettingResolver', () => {
  let mockService: Partial<LlmSettingService>;
  let resolver: LlmSettingResolver;

  beforeEach(() => {
    vi.clearAllMocks();

    mockService = {
      getSetting: vi.fn(),
      updateSetting: vi.fn(),
    };

    resolver = new LlmSettingResolver(mockService as LlmSettingService);
  });

  it('queries llmSetting with masked api key', async () => {
    vi.mocked(mockService.getSetting!).mockResolvedValueOnce({
      id: 'default',
      endpoint: 'https://openrouter.ai/api/v1',
      apiKey: 'sk-or-v1-abcdef1234567890xyz',
      model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await resolver.llmSetting();

    expect(result.id).toBe('default');
    expect(result.endpoint).toBe('https://openrouter.ai/api/v1');
    expect(result.model).toBe('nvidia/nemotron-3-ultra-550b-a55b:free');
    expect(result.apiKeyMasked).toBe('sk-o...****0xyz');
  });

  it('updates llmSetting and returns masked api key', async () => {
    vi.mocked(mockService.updateSetting!).mockResolvedValueOnce({
      id: 'default',
      endpoint: 'https://custom-endpoint.com/v1',
      apiKey: 'sk-secret-new-key-1234',
      model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
      thinkingLevel: 'high',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await resolver.updateLlmSetting(
      'https://custom-endpoint.com/v1',
      'sk-secret-new-key-1234',
      'nvidia/nemotron-3-ultra-550b-a55b:free',
      'high'
    );

    expect(mockService.updateSetting).toHaveBeenCalledWith({
      endpoint: 'https://custom-endpoint.com/v1',
      apiKey: 'sk-secret-new-key-1234',
      model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
      thinkingLevel: 'high',
    });

    expect(result.endpoint).toBe('https://custom-endpoint.com/v1');
    expect(result.apiKeyMasked).toBe('sk-s...****1234');
    expect(result.thinkingLevel).toBe('high');
  });
});
