import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { type LlmSetting, type LlmSettingRepository, LlmSettingRepositoryToken } from '@darun/translation-domain';
import { eq } from 'drizzle-orm';
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
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async upsertSetting(input: {
    endpoint: string;
    apiKey?: string | null;
    model: string;
    thinkingLevel?: string | null;
  }): Promise<LlmSetting> {
    const rows = await this.db
      .insert(llmSettings)
      .values({
        id: DEFAULT_SETTING_ID,
        endpoint: input.endpoint,
        apiKey: input.apiKey ?? null,
        model: input.model,
        thinkingLevel: input.thinkingLevel ?? null,
      })
      .onConflictDoUpdate({
        target: llmSettings.id,
        set: {
          endpoint: input.endpoint,
          apiKey: input.apiKey !== undefined ? input.apiKey : undefined,
          model: input.model,
          thinkingLevel: input.thinkingLevel !== undefined ? input.thinkingLevel : undefined,
          updatedAt: new Date(),
        },
      })
      .returning();

    const row = rows[0];
    if (!row) {
      throw new Error('LlmSetting upsert failed');
    }

    return {
      id: row.id,
      endpoint: row.endpoint,
      apiKey: row.apiKey,
      model: row.model,
      thinkingLevel: row.thinkingLevel,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
