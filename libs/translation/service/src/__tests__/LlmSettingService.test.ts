import type { LlmSetting, LlmSettingRepository } from '@darun/translation-domain';
import { LlmConfigReadFailedError } from '@darun/utils-llm';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LlmSettingService } from '../LlmSettingService';

function makeSetting(overrides: Partial<LlmSetting>): LlmSetting {
  return {
    id: 'default',
    endpoint: 'https://openrouter.ai/api/v1',
    apiKey: null,
    model: 'nvidia/nemotron-3-super-120b-a12b:free',
    thinkingLevel: null,
    braveApiKey: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('LlmSettingService', () => {
  let mockRepository: LlmSettingRepository;
  let service: LlmSettingService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env['OPEN_ROUTER_API_KEY'] = 'env-api-key';
    delete process.env['OPEN_ROUTER_ENDPOINT'];

    mockRepository = {
      findSetting: vi.fn(),
      upsertSetting: vi.fn(),
    };

    service = new LlmSettingService(mockRepository);
  });

  describe('getConfig 키 정책', () => {
    it('정상 row 부재는 기본 OpenRouter 구성과 환경 기본 키를 사용한다', async () => {
      vi.mocked(mockRepository.findSetting).mockResolvedValueOnce(null);

      const config = await service.getConfig();

      expect(config.endpoint).toBe('https://openrouter.ai/api/v1');
      expect(config.model).toBe('nvidia/nemotron-3-super-120b-a12b:free');
      expect(config.apiKey).toBe('env-api-key');
    });

    it('저장된 row의 커스텀 키를 사용한다', async () => {
      vi.mocked(mockRepository.findSetting).mockResolvedValueOnce(
        makeSetting({ endpoint: 'https://custom-openrouter.ai/api/v1', apiKey: 'custom-secret-key' })
      );

      const config = await service.getConfig();

      expect(config.endpoint).toBe('https://custom-openrouter.ai/api/v1');
      expect(config.apiKey).toBe('custom-secret-key');
    });

    it('커스텀 엔드포인트 row에 키가 없으면 환경 기본 키를 전송하지 않는다', async () => {
      vi.mocked(mockRepository.findSetting).mockResolvedValueOnce(
        makeSetting({ endpoint: 'https://custom-openrouter.ai/api/v1', apiKey: null })
      );

      const config = await service.getConfig();

      expect(config.endpoint).toBe('https://custom-openrouter.ai/api/v1');
      expect(config.apiKey).toBe('');
    });

    it('기본 OpenRouter base의 row에 키가 없으면 환경 기본 키를 사용한다', async () => {
      vi.mocked(mockRepository.findSetting).mockResolvedValueOnce(
        makeSetting({ endpoint: 'https://openrouter.ai/api/v1', apiKey: null })
      );

      const config = await service.getConfig();

      expect(config.apiKey).toBe('env-api-key');
    });

    it('조회 장애는 LLM_CONFIG_READ_FAILED로 전파되고 기본 설정으로 대체하지 않는다', async () => {
      vi.mocked(mockRepository.findSetting).mockRejectedValueOnce(new Error('connection refused'));

      const error = await service.getConfig().catch(e => e);

      expect(error).toBeInstanceOf(LlmConfigReadFailedError);
      expect((error as LlmConfigReadFailedError).code).toBe('LLM_CONFIG_READ_FAILED');
    });
  });

  describe('getSetting', () => {
    it('row 부재 시 브라우저 응답에 환경 키를 노출하지 않는다', async () => {
      vi.mocked(mockRepository.findSetting).mockResolvedValueOnce(null);

      const setting = await service.getSetting();

      expect(setting.apiKey).toBeNull();
      expect(setting.endpoint).toBe('https://openrouter.ai/api/v1');
    });

    it('조회 장애는 LLM_CONFIG_READ_FAILED로 전파된다', async () => {
      vi.mocked(mockRepository.findSetting).mockRejectedValueOnce(new Error('db down'));

      await expect(service.getSetting()).rejects.toBeInstanceOf(LlmConfigReadFailedError);
    });
  });

  describe('updateSetting', () => {
    it('값을 정규화해 저장하고 변경 없는 필드를 유지한다', async () => {
      vi.mocked(mockRepository.findSetting).mockResolvedValueOnce(
        makeSetting({ apiKey: 'old-key', thinkingLevel: 'low' })
      );
      vi.mocked(mockRepository.upsertSetting).mockImplementationOnce(async input => makeSetting(input));

      await service.updateSetting({
        model: ' anthropic/claude-3.5-sonnet ',
        apiKey: ' new-secret-key ',
        thinkingLevel: ' high ',
      });

      expect(mockRepository.upsertSetting).toHaveBeenCalledWith({
        endpoint: 'https://openrouter.ai/api/v1',
        apiKey: 'new-secret-key',
        model: 'anthropic/claude-3.5-sonnet',
        thinkingLevel: 'high',
        braveApiKey: null,
      });
    });

    it('endpoint가 같고 키 입력이 없으면 실제 저장 키를 유지한다', async () => {
      vi.mocked(mockRepository.findSetting).mockResolvedValueOnce(makeSetting({ apiKey: 'stored-key' }));
      vi.mocked(mockRepository.upsertSetting).mockImplementationOnce(async input => makeSetting(input));

      await service.updateSetting({ model: 'x-ai/grok-4-fast' });

      expect(vi.mocked(mockRepository.upsertSetting).mock.calls[0][0].apiKey).toBe('stored-key');
    });

    it('endpoint가 바뀌는데 키 입력이 없으면 기존 공급자 키를 비운다', async () => {
      vi.mocked(mockRepository.findSetting).mockResolvedValueOnce(makeSetting({ apiKey: 'old-provider-key' }));
      vi.mocked(mockRepository.upsertSetting).mockImplementationOnce(async input => makeSetting(input));

      await service.updateSetting({ endpoint: 'https://new-provider.example.com/v1' });

      expect(vi.mocked(mockRepository.upsertSetting).mock.calls[0][0].apiKey).toBeNull();
    });

    it('최초 endpoint-only 저장은 환경 키를 저장하지 않는다', async () => {
      vi.mocked(mockRepository.findSetting).mockResolvedValueOnce(null);
      vi.mocked(mockRepository.upsertSetting).mockImplementationOnce(async input => makeSetting(input));

      await service.updateSetting({ endpoint: 'https://custom.example.com/v1', model: 'm1' });

      expect(vi.mocked(mockRepository.upsertSetting).mock.calls[0][0].apiKey).toBeNull();
    });

    it('커스텀 엔드포인트에 환경 기본 키와 같은 키 저장을 거절한다', async () => {
      vi.mocked(mockRepository.findSetting).mockResolvedValueOnce(null);

      await expect(
        service.updateSetting({ endpoint: 'https://custom.example.com/v1', apiKey: 'env-api-key' })
      ).rejects.toThrow('OPEN_ROUTER_API_KEY');

      expect(mockRepository.upsertSetting).not.toHaveBeenCalled();
    });

    it('기본 OpenRouter 엔드포인트에는 환경과 같은 키 저장을 허용한다', async () => {
      vi.mocked(mockRepository.findSetting).mockResolvedValueOnce(null);
      vi.mocked(mockRepository.upsertSetting).mockImplementationOnce(async input => makeSetting(input));

      await service.updateSetting({ endpoint: 'https://openrouter.ai/api/v1', apiKey: 'env-api-key' });

      expect(vi.mocked(mockRepository.upsertSetting).mock.calls[0][0].apiKey).toBe('env-api-key');
    });
  });
});
