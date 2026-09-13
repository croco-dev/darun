import { Token } from 'typedi';
import type { LlmSetting } from '../entities/LlmSetting';

export const LlmSettingRepositoryToken = new Token<LlmSettingRepository>('LlmSettingRepository');

export interface LlmSettingRepository {
  findSetting(): Promise<LlmSetting | null>;
  upsertSetting(input: {
    endpoint: string;
    apiKey?: string | null;
    model: string;
    thinkingLevel?: string | null;
  }): Promise<LlmSetting>;
}
