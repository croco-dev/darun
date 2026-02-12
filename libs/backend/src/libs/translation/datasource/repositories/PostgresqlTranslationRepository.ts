import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { and, eq } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { TranslationRepository, TranslationRepositoryToken, TranslationRow } from '../../domain';
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

  async upsert(params: {
    entityType: string;
    entityId: string;
    locale: string;
    field: string;
    value: string;
  }): Promise<TranslationRow> {
    const { entityType, entityId, locale, field, value } = params;

    const rows = await this.db
      .insert(translations)
      .values({ entityType, entityId, locale, field, value })
      .onConflictDoUpdate({
        target: [translations.entityType, translations.entityId, translations.locale, translations.field],
        set: { value, updatedAt: new Date() },
      })
      .returning();

    if (!rows[0]) {
      throw new Error('Translation upsert failed');
    }

    return rows[0];
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
