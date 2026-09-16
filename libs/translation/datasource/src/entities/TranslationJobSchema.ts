import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const translationJobs = pgTable(
  'translation_jobs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    locale: text('locale').notNull().default('en'),
    status: text('status').notNull().default('pending'),
    message: text('message'),
    error: text('error'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    entityIdx: index('translation_jobs_entity_idx').on(table.entityType, table.entityId),
    statusIdx: index('translation_jobs_status_idx').on(table.status),
  })
);

export type TranslationJobRow = typeof translationJobs.$inferSelect;
export type InsertTranslationJobRow = typeof translationJobs.$inferInsert;
