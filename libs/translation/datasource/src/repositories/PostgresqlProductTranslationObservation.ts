import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { translationJobs } from '../entities/TranslationJobSchema';
import { translations } from '../entities/TranslationSchema';

@Service()
export class PostgresqlProductTranslationObservation {
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

  read(productId: string, fields: string[]) {
    return this.db.transaction(
      async tx => {
        const observedAt = new Date();
        const rows = await tx
          .select({ field: translations.field, sourceHash: translations.sourceHash })
          .from(translations)
          .where(
            and(
              eq(translations.entityType, 'Product'),
              eq(translations.entityId, productId),
              eq(translations.locale, 'en'),
              inArray(translations.field, fields)
            )
          );
        const [latestJob] = await tx
          .select({ status: translationJobs.status })
          .from(translationJobs)
          .where(
            and(
              eq(translationJobs.entityType, 'Product'),
              eq(translationJobs.entityId, productId),
              eq(translationJobs.locale, 'en')
            )
          )
          .orderBy(desc(translationJobs.createdAt), desc(translationJobs.id))
          .limit(1);
        return { translations: rows, observedAt, latestJobFailed: latestJob?.status === 'failed' };
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' }
    );
  }
}
