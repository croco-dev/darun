import { LlmSettingService } from '@darun/translation-service';
import { AuthRole } from '@darun/utils-apollo-server';
import { Arg, Authorized, Mutation, Query, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { LlmSettingGraph } from './graphs/LlmSettingGraph';

function maskApiKey(apiKey?: string | null): string | null {
  if (!apiKey) {
    return null;
  }
  const trimmed = apiKey.trim();
  if (trimmed.length <= 8) {
    return '****';
  }
  const prefix = trimmed.slice(0, 4);
  const suffix = trimmed.slice(-4);
  return `${prefix}...****${suffix}`;
}

@Resolver()
@Service()
export class LlmSettingResolver {
  constructor(private readonly llmSettingService: LlmSettingService) {}

  @Authorized([AuthRole.Admin])
  @Query(() => LlmSettingGraph)
  async llmSetting(): Promise<LlmSettingGraph> {
    const setting = await this.llmSettingService.getSetting();

    return {
      id: setting.id,
      endpoint: setting.endpoint,
      apiKeyMasked: maskApiKey(setting.apiKey),
      model: setting.model,
      thinkingLevel: setting.thinkingLevel,
      updatedAt: setting.updatedAt,
    };
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => LlmSettingGraph)
  async updateLlmSetting(
    @Arg('endpoint', () => String, { nullable: true }) endpoint?: string,
    @Arg('apiKey', () => String, { nullable: true }) apiKey?: string,
    @Arg('model', () => String, { nullable: true }) model?: string,
    @Arg('thinkingLevel', () => String, { nullable: true })
    thinkingLevel?: string
  ): Promise<LlmSettingGraph> {
    const updated = await this.llmSettingService.updateSetting({
      endpoint,
      apiKey,
      model,
      thinkingLevel,
    });

    return {
      id: updated.id,
      endpoint: updated.endpoint,
      apiKeyMasked: maskApiKey(updated.apiKey),
      model: updated.model,
      thinkingLevel: updated.thinkingLevel,
      updatedAt: updated.updatedAt,
    };
  }
}
