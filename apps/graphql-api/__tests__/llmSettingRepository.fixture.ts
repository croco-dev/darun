import type { LlmSettingRepository, LlmSettingWrite, LlmSetting } from '@darun/translation-domain';
import { LlmConfigReadFailedError } from '@darun/utils-llm';

// Telemetry fixtures exercise policy and safe errors, not database concurrency.
export function settingRepositoryFixture(
  findSetting: LlmSettingRepository['findSetting'],
  writeSetting: (input: LlmSettingWrite) => Promise<LlmSetting>
): LlmSettingRepository {
  return {
    findSetting,
    updateSetting: async modify => {
      let current;
      try {
        current = await findSetting();
      } catch {
        throw new LlmConfigReadFailedError();
      }
      return writeSetting(modify(current));
    },
  };
}
