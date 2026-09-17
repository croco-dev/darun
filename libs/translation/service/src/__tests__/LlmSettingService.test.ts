import type { LlmSetting, LlmSettingRepository } from '@darun/translation-domain';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LlmSettingService } from '../LlmSettingService';

describe('LlmSettingService', () => {
  let mockRepository: LlmSettingRepository;
  let service: LlmSettingService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env['OPEN_ROUTER_API_KEY'] = 'env-api-key';
    process.env['BRAVE_API_KEY'] = 'env-brave-key';

    mockRepository = {
      findSetting: vi.fn(),
      upsertSetting: vi.fn(),
    };

    service = new LlmSettingService(mockRepository);
  });

  it('should return default config when DB has no record', async () => {
    vi.mocked(mockRepository.findSetting).mockResolvedValueOnce(null);

    const config = await service.getConfig();

    expect(config.endpoint).toBe('https://openrouter.ai/api/v1');
    expect(config.model).toBe('nvidia/nemotron-3-ultra-550b-a55b:free');
    expect(config.apiKey).toBe('env-api-key');
    expect(config.braveApiKey).toBe('env-brave-key');
  });

  it('should return DB config when record exists', async () => {
    const dbRecord: LlmSetting = {
      id: 'default',
      endpoint: 'https://custom-openrouter.ai/api/v1',
      apiKey: 'custom-secret-key',
      model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
      braveApiKey: 'custom-brave-key',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(mockRepository.findSetting).mockResolvedValueOnce(dbRecord);

    const config = await service.getConfig();

    expect(config.endpoint).toBe('https://custom-openrouter.ai/api/v1');
    expect(config.apiKey).toBe('custom-secret-key');
    expect(config.model).toBe('nvidia/nemotron-3-ultra-550b-a55b:free');
    expect(config.thinkingLevel).toBeNull();
    expect(config.braveApiKey).toBe('custom-brave-key');
  });

  it('should update setting with trimmed values and preserve unchanged values', async () => {
    const currentRecord: LlmSetting = {
      id: 'default',
      endpoint: 'https://openrouter.ai/api/v1',
      apiKey: 'old-key',
      model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
      thinkingLevel: 'low',
      braveApiKey: 'old-brave-key',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(mockRepository.findSetting).mockResolvedValueOnce(currentRecord);
    vi.mocked(mockRepository.upsertSetting).mockImplementationOnce(async input => ({
      id: 'default',
      endpoint: input.endpoint,
      apiKey: input.apiKey,
      model: input.model,
      thinkingLevel: input.thinkingLevel,
      braveApiKey: input.braveApiKey,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const result = await service.updateSetting({
      model: ' anthropic/claude-3.5-sonnet ',
      apiKey: ' new-secret-key ',
      thinkingLevel: ' high ',
      braveApiKey: ' new-brave-key ',
    });

    expect(mockRepository.upsertSetting).toHaveBeenCalledWith({
      endpoint: 'https://openrouter.ai/api/v1',
      apiKey: 'new-secret-key',
      model: 'anthropic/claude-3.5-sonnet',
      thinkingLevel: 'high',
      braveApiKey: 'new-brave-key',
    });

    expect(result.model).toBe('anthropic/claude-3.5-sonnet');
    expect(result.apiKey).toBe('new-secret-key');
    expect(result.thinkingLevel).toBe('high');
    expect(result.braveApiKey).toBe('new-brave-key');
  });

  it('should allow clearing braveApiKey by passing empty string or null', async () => {
    const currentRecord: LlmSetting = {
      id: 'default',
      endpoint: 'https://openrouter.ai/api/v1',
      apiKey: 'old-key',
      model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
      braveApiKey: 'existing-brave-key',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(mockRepository.findSetting).mockResolvedValueOnce(currentRecord);
    vi.mocked(mockRepository.upsertSetting).mockImplementationOnce(async input => ({
      id: 'default',
      endpoint: input.endpoint,
      apiKey: input.apiKey,
      model: input.model,
      thinkingLevel: input.thinkingLevel,
      braveApiKey: input.braveApiKey,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const result = await service.updateSetting({
      braveApiKey: '',
    });

    expect(mockRepository.upsertSetting).toHaveBeenCalledWith({
      endpoint: 'https://openrouter.ai/api/v1',
      apiKey: 'old-key',
      model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
      thinkingLevel: undefined,
      braveApiKey: null,
    });

    expect(result.braveApiKey).toBeNull();
  });
});
