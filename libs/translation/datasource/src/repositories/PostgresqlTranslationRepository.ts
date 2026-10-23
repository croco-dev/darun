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
  constructor(@Inject(DrizzleToken) private readonly db: Pick<Drizzle, 'select' | 'insert'>) {}

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
    const [row] = await this.upsertMany([params]);
    if (!row) throw new Error('Translation upsert failed');
    return row;
  }

  async upsertMany(paramsList: UpsertTranslationParams[]): Promise<TranslationRow[]> {
    if (!paramsList.length) return [];
    return this.db.transaction(async tx => {
      const writes: UpsertTranslationParams[] = [];
      const unchanged: TranslationRow[] = [];
      const keys = new Set<string>();
      for (const params of paramsList) {
        const key = JSON.stringify([params.entityType, params.entityId, params.locale, params.field]);
        if (keys.has(key)) throw new Error('Duplicate translation write');
        keys.add(key);
      }
      for (const params of [...paramsList].sort((a, b) =>
        JSON.stringify([a.entityType, a.entityId, a.locale, a.field]).localeCompare(
          JSON.stringify([b.entityType, b.entityId, b.locale, b.field])
        )
      )) {
        const complete = [params.sourceHash, params.model, params.promptVersion].every(
          value => typeof value === 'string' && value.trim().length > 0
        );
        if (complete) {
          writes.push(params);
          continue;
        }
        const [existing] = await tx
          .select()
          .from(translations)
          .where(
            and(
              eq(translations.entityType, params.entityType),
              eq(translations.entityId, params.entityId),
              eq(translations.locale, params.locale),
              eq(translations.field, params.field)
            )
          )
          .for('update');
        if (!existing || existing.value !== params.value) {
          throw new Error('Translation value changes require sourceHash, model and promptVersion');
        }
        // A legacy same-value no-op cannot replace or erase the stored provenance.
        unchanged.push(existing);
      }
      if (!writes.length) return unchanged;
      const written = await tx
        .insert(translations)
        .values(writes)
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
      return [...written, ...unchanged];
    });
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
