import { index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const translationJobs = pgTable(
  'translation_jobs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    locale: text('locale').notNull().default('en'),
    fields: text('fields').array(),
    idempotencyKey: text('idempotency_key').unique(),
    status: text('status').notNull().default('pending'),
    message: text('message'),
    error: text('error'),
    sourceHash: text('source_hash'),
    model: text('model'),
    promptVersion: text('prompt_version'),
    leaseToken: text('lease_token'),
    leaseUntil: timestamp('lease_until'),
    attemptCount: integer('attempt_count').notNull().default(0),
    runNotBefore: timestamp('run_not_before').defaultNow().notNull(),
    nextDispatchAt: timestamp('next_dispatch_at').defaultNow().notNull(),
    retryOfJobId: text('retry_of_job_id'),
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
