import { type LlmSetting, type LlmSettingRepository, LlmSettingRepositoryToken } from '@darun/translation-domain';
import {
  DEFAULT_LLM_ENDPOINT,
  DEFAULT_LLM_MODEL,
  LlmEndpointKeyError,
  LlmConfigReadFailedError,
  normalizeLlmEndpointBase,
  resolveLlmEndpointKey,
  type LlmConfig,
  type LlmConfigProvider,
} from '@darun/utils-llm';
import { Inject, Service } from 'typedi';

class LlmSettingSaveFailedError extends Error {
  readonly code = 'LLM_SETTING_SAVE_FAILED';

  constructor() {
    super('LLM 설정을 저장하지 못했습니다.');
    this.name = 'LlmSettingSaveFailedError';
  }
}

@Service()
export class LlmSettingService implements LlmConfigProvider {
  constructor(
    @Inject(LlmSettingRepositoryToken)
    private readonly llmSettingRepository: LlmSettingRepository
  ) {}

  /**
   * 실제 LLM 호출에 사용할 설정. 키 선택은 utils-llm의 단일 정책(resolveLlmEndpointKey)을 따른다.
   * 정상 row 부재(null)만 환경 기본 구성으로 해석하고, 조회 장애는 LLM_CONFIG_READ_FAILED로 전파한다.
   */
  async getConfig(): Promise<LlmConfig> {
    const setting = await this.findSettingOrFail();
    const endpoint = setting?.endpoint || process.env['OPEN_ROUTER_ENDPOINT'] || DEFAULT_LLM_ENDPOINT;

    const keyDecision = resolveLlmEndpointKey({
      endpoint,
      explicitApiKey: setting?.apiKey ?? null,
      envApiKey: process.env['OPEN_ROUTER_API_KEY'] ?? null,
    });
    if (!keyDecision.allowed) {
      throw new LlmEndpointKeyError();
    }

    return {
      endpoint,
      apiKey: keyDecision.apiKey ?? '',
      model: setting?.model || process.env['OPEN_ROUTER_MODEL'] || DEFAULT_LLM_MODEL,
      thinkingLevel: setting?.thinkingLevel || process.env['OPEN_ROUTER_THINKING_LEVEL'] || null,
    };
  }

  async getSetting(): Promise<LlmSetting> {
    const existing = await this.findSettingOrFail();
    if (existing) {
      return existing;
    }

    return this.defaultSetting();
  }

  private defaultSetting(): LlmSetting {
    // 정상 row 부재에만 사용하며 환경 기본 LLM 키는 저장하거나 응답하지 않는다.
    return {
      id: 'default',
      endpoint: process.env['OPEN_ROUTER_ENDPOINT'] || DEFAULT_LLM_ENDPOINT,
      apiKey: null,
      model: process.env['OPEN_ROUTER_MODEL'] || DEFAULT_LLM_MODEL,
      thinkingLevel: process.env['OPEN_ROUTER_THINKING_LEVEL'] || null,
      braveApiKey: process.env['BRAVE_API_KEY'] || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async getBraveApiKey(): Promise<string | null> {
    const setting = await this.findSettingOrFail();
    const stored = setting?.braveApiKey?.trim();
    if (stored) {
      return stored;
    }
    const envKey = process.env['BRAVE_API_KEY']?.trim();
    return envKey ? envKey : null;
  }

  async updateSetting(input: {
    endpoint?: string;
    apiKey?: string | null;
    model?: string;
    thinkingLevel?: string | null;
    braveApiKey?: string | null;
  }): Promise<LlmSetting> {
    try {
      return await this.llmSettingRepository.updateSetting(existing => {
        const current = existing ?? this.defaultSetting();
        const newEndpoint = input.endpoint?.trim() || current.endpoint;
        const endpointChanged = normalizeLlmEndpointBase(newEndpoint) !== normalizeLlmEndpointBase(current.endpoint);
        const newModel = input.model?.trim() || current.model;
        const newThinkingLevel =
          input.thinkingLevel !== undefined
            ? input.thinkingLevel === '' || input.thinkingLevel === null
              ? null
              : input.thinkingLevel.trim()
            : (current.thinkingLevel ?? null);
        const newBraveApiKey =
          input.braveApiKey !== undefined
            ? input.braveApiKey === '' || input.braveApiKey === null
              ? null
              : input.braveApiKey.trim()
            : (current.braveApiKey ?? null);

        // 커스텀 엔드포인트에는 그 공급자 전용 키만 저장한다. 환경 기본 키를 커스텀 base로 저장·전송하지 않는다.
        const explicitApiKey = input.apiKey !== undefined ? input.apiKey?.trim() || null : null;
        if (explicitApiKey) {
          const keyDecision = resolveLlmEndpointKey({
            endpoint: newEndpoint,
            explicitApiKey,
            envApiKey: process.env['OPEN_ROUTER_API_KEY'] ?? null,
          });
          if (!keyDecision.allowed) {
            throw new LlmEndpointKeyError();
          }
        }

        let newApiKey: string | null;
        if (input.apiKey !== undefined) {
          newApiKey = explicitApiKey;
        } else if (endpointChanged) {
          // 엔드포인트가 바뀌는데 새 키 입력이 없으면 이전 공급자의 저장 키도 비운다.
          newApiKey = null;
        } else {
          newApiKey = current.apiKey ?? null;
        }

        return {
          endpoint: newEndpoint,
          apiKey: newApiKey,
          model: newModel,
          thinkingLevel: newThinkingLevel,
          braveApiKey: newBraveApiKey,
        };
      });
    } catch (error) {
      if (error instanceof LlmEndpointKeyError || error instanceof LlmConfigReadFailedError) throw error;
      // Database errors may contain SQL parameters, including newly supplied or stored keys.
      throw new LlmSettingSaveFailedError();
    }
  }

  private async findSettingOrFail(): Promise<LlmSetting | null> {
    try {
      return await this.llmSettingRepository.findSetting();
    } catch {
      throw new LlmConfigReadFailedError();
    }
  }
}
