import type { LlmSetting, LlmSettingRepository } from '@darun/translation-domain';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LlmSettingService } from '../LlmSettingService';

describe('LlmSettingService', () => {
  let mockRepository: LlmSettingRepository;
  let service: LlmSettingService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env['OPEN_ROUTER_API_KEY'] = 'env-api-key';

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
  });

  it('should return DB config when record exists', async () => {
    const dbRecord: LlmSetting = {
      id: 'default',
      endpoint: 'https://custom-openrouter.ai/api/v1',
      apiKey: 'custom-secret-key',
      model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(mockRepository.findSetting).mockResolvedValueOnce(dbRecord);

    const config = await service.getConfig();

    expect(config.endpoint).toBe('https://custom-openrouter.ai/api/v1');
    expect(config.apiKey).toBe('custom-secret-key');
    expect(config.model).toBe('nvidia/nemotron-3-ultra-550b-a55b:free');
    expect(config.thinkingLevel).toBeNull();
  });

  it('should update setting with trimmed values and preserve unchanged values', async () => {
    const currentRecord: LlmSetting = {
      id: 'default',
      endpoint: 'https://openrouter.ai/api/v1',
      apiKey: 'old-key',
      model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
      thinkingLevel: 'low',
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
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const result = await service.updateSetting({
      model: ' anthropic/claude-3.5-sonnet ',
      apiKey: ' new-secret-key ',
      thinkingLevel: ' high ',
    });

    expect(mockRepository.upsertSetting).toHaveBeenCalledWith({
      endpoint: 'https://openrouter.ai/api/v1',
      apiKey: 'new-secret-key',
      model: 'anthropic/claude-3.5-sonnet',
      thinkingLevel: 'high',
    });

    expect(result.model).toBe('anthropic/claude-3.5-sonnet');
    expect(result.apiKey).toBe('new-secret-key');
    expect(result.thinkingLevel).toBe('high');
  });
});
