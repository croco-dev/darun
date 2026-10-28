import { Token } from 'typedi';
import type { LlmSetting } from '../entities/LlmSetting';

export const LlmSettingRepositoryToken = new Token<LlmSettingRepository>('LlmSettingRepository');

export type LlmSettingWrite = Pick<LlmSetting, 'endpoint' | 'model'> & {
  apiKey: string | null;
  thinkingLevel: string | null;
  braveApiKey: string | null;
};

export interface LlmSettingRepository {
  findSetting(): Promise<LlmSetting | null>;
  /** Runs the synchronous modifier once against the latest row under a transaction lock, including first creation. */
  updateSetting(modify: (current: LlmSetting | null) => LlmSettingWrite): Promise<LlmSetting>;
}
