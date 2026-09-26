import { Drizzle, DrizzleToken } from '@darun/provider-database';
import {
  type TranslationRepository,
  type TranslationRow,
  type UpsertTranslationParams,
  TranslationRepositoryToken,
} from '@darun/translation-domain';
import { and, eq, or, sql } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { translations } from '../entities/TranslationSchema';

@Service(TranslationRepositoryToken)
export class PostgresqlTranslationRepository implements TranslationRepository {
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

  async findOne(params: {
    entityType: string;
    entityId: string;
    locale: string;
    field: string;
  }): Promise<TranslationRow | null> {
    const { entityType, entityId, locale, field } = params;

    return this.db
      .select()
      .from(translations)
      .where(
        and(
          eq(translations.entityType, entityType),
          eq(translations.entityId, entityId),
          eq(translations.locale, locale),
          eq(translations.field, field)
        )
      )
      .limit(1)
      .then(rows => rows[0] ?? null);
  }

  async findMany(params: {
    entityType: string;
    locale: string;
    entities: Array<{
      entityId: string;
      field: string;
    }>;
  }): Promise<TranslationRow[]> {
    const { entityType, locale, entities } = params;

    if (entities.length === 0) {
      return [];
    }

    const uniquePairs = Array.from(
      new Map(entities.map(entity => [`${entity.entityId}:${entity.field}`, entity])).values()
    );

    return this.db
      .select()
      .from(translations)
      .where(
        and(
          eq(translations.entityType, entityType),
          eq(translations.locale, locale),
          or(
            ...uniquePairs.map(({ entityId, field }) =>
              and(eq(translations.entityId, entityId), eq(translations.field, field))
            )
          )
        )
      );
  }

  async upsert(params: UpsertTranslationParams): Promise<TranslationRow> {
    const { entityType, entityId, locale, field, value, sourceHash, model, promptVersion } = params;

    const rows = await this.db
      .insert(translations)
      .values({ entityType, entityId, locale, field, value, sourceHash, model, promptVersion })
      .onConflictDoUpdate({
        target: [translations.entityType, translations.entityId, translations.locale, translations.field],
        set: {
          value,
          sourceHash: sourceHash !== undefined ? sourceHash : sql`${translations.sourceHash}`,
          model: model !== undefined ? model : sql`${translations.model}`,
          promptVersion: promptVersion !== undefined ? promptVersion : sql`${translations.promptVersion}`,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!rows[0]) {
      throw new Error('Translation upsert failed');
    }

    return rows[0];
  }

  async upsertMany(paramsList: UpsertTranslationParams[]): Promise<TranslationRow[]> {
    if (paramsList.length === 0) {
      return [];
    }

    const values = paramsList.map(p => ({
      entityType: p.entityType,
      entityId: p.entityId,
      locale: p.locale,
      field: p.field,
      value: p.value,
      sourceHash: p.sourceHash ?? null,
      model: p.model ?? null,
      promptVersion: p.promptVersion ?? null,
    }));

    return this.db
      .insert(translations)
      .values(values)
      .onConflictDoUpdate({
        target: [translations.entityType, translations.entityId, translations.locale, translations.field],
        set: {
          value: sql`excluded.value`,
          sourceHash: sql`excluded.source_hash`,
          model: sql`excluded.model`,
          promptVersion: sql`excluded.prompt_version`,
          updatedAt: new Date(),
        },
      })
      .returning();
  }

  async findByEntity(params: { entityType: string; entityId: string; locale: string }): Promise<TranslationRow[]> {
    const { entityType, entityId, locale } = params;

    return this.db
      .select()
      .from(translations)
      .where(
        and(
          eq(translations.entityType, entityType),
          eq(translations.entityId, entityId),
          eq(translations.locale, locale)
        )
      );
  }
}
