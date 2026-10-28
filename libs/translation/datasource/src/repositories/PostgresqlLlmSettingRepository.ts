import { Drizzle, DrizzleToken } from '@darun/provider-database';
import {
  type LlmSetting,
  type LlmSettingRepository,
  type LlmSettingWrite,
  LlmSettingRepositoryToken,
} from '@darun/translation-domain';
import { LlmConfigReadFailedError } from '@darun/utils-llm';
import { eq, sql } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { llmSettings } from '../entities/LlmSettingSchema';

const DEFAULT_SETTING_ID = 'default';

@Service(LlmSettingRepositoryToken)
export class PostgresqlLlmSettingRepository implements LlmSettingRepository {
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

  async findSetting(): Promise<LlmSetting | null> {
    const rows = await this.db.select().from(llmSettings).where(eq(llmSettings.id, DEFAULT_SETTING_ID)).limit(1);

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      endpoint: row.endpoint,
      apiKey: row.apiKey,
      model: row.model,
      thinkingLevel: row.thinkingLevel,
      braveApiKey: row.braveApiKey,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async updateSetting(modify: (current: LlmSetting | null) => LlmSettingWrite): Promise<LlmSetting> {
    return await this.db.transaction(async tx => {
      // Row locks cannot protect an absent singleton. Serialize creation and all
      // later modifiers with the same transaction-scoped lock before reading.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('llm_settings'), hashtext(${DEFAULT_SETTING_ID}))`);
      let current: LlmSetting | null;
      try {
        const rows = await tx.select().from(llmSettings).where(eq(llmSettings.id, DEFAULT_SETTING_ID)).for('update');
        current = rows[0] ?? null;
      } catch {
        throw new LlmConfigReadFailedError();
      }
      const input = modify(current);
      const rows = await tx
        .insert(llmSettings)
        .values({ id: DEFAULT_SETTING_ID, ...input })
        .onConflictDoUpdate({
          target: llmSettings.id,
          set: { ...input, updatedAt: new Date() },
        })
        .returning();
      const row = rows[0];
      if (!row) throw new Error('LlmSetting update failed');
      return row;
    });
  }
}
