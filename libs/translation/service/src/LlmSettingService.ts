import { type LlmSetting, type LlmSettingRepository, LlmSettingRepositoryToken } from '@darun/translation-domain';
import { DEFAULT_LLM_ENDPOINT, DEFAULT_LLM_MODEL, type LlmConfig, type LlmConfigProvider } from '@darun/utils-llm';
import { Inject, Service } from 'typedi';

@Service()
export class LlmSettingService implements LlmConfigProvider {
  constructor(
    @Inject(LlmSettingRepositoryToken)
    private readonly llmSettingRepository: LlmSettingRepository
  ) {}

  async getConfig(): Promise<LlmConfig> {
    const setting = await this.llmSettingRepository.findSetting();
    const envApiKey = process.env['OPEN_ROUTER_API_KEY'] || '';

    return {
      endpoint: setting?.endpoint || process.env['OPEN_ROUTER_ENDPOINT'] || DEFAULT_LLM_ENDPOINT,
      apiKey: setting?.apiKey || envApiKey,
      model: setting?.model || process.env['OPEN_ROUTER_MODEL'] || DEFAULT_LLM_MODEL,
      thinkingLevel: setting?.thinkingLevel || process.env['OPEN_ROUTER_THINKING_LEVEL'] || null,
    };
  }

  async getSetting(): Promise<LlmSetting> {
    const existing = await this.llmSettingRepository.findSetting();
    if (existing) {
      return existing;
    }

    // DB에 레코드가 아직 없으면 기본 설정 반환
    return {
      id: 'default',
      endpoint: process.env['OPEN_ROUTER_ENDPOINT'] || DEFAULT_LLM_ENDPOINT,
      apiKey: process.env['OPEN_ROUTER_API_KEY'] || null,
      model: process.env['OPEN_ROUTER_MODEL'] || DEFAULT_LLM_MODEL,
      thinkingLevel: process.env['OPEN_ROUTER_THINKING_LEVEL'] || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async updateSetting(input: {
    endpoint?: string;
    apiKey?: string | null;
    model?: string;
    thinkingLevel?: string | null;
  }): Promise<LlmSetting> {
    const current = await this.getSetting();

    const newEndpoint = input.endpoint?.trim() || current.endpoint;
    const newModel = input.model?.trim() || current.model;
    const newApiKey =
      input.apiKey !== undefined
        ? input.apiKey === '' || input.apiKey === null
          ? null
          : input.apiKey.trim()
        : current.apiKey;
    const newThinkingLevel =
      input.thinkingLevel !== undefined
        ? input.thinkingLevel === '' || input.thinkingLevel === null
          ? null
          : input.thinkingLevel.trim()
        : current.thinkingLevel;

    return this.llmSettingRepository.upsertSetting({
      endpoint: newEndpoint,
      apiKey: newApiKey,
      model: newModel,
      thinkingLevel: newThinkingLevel,
    });
  }
}
