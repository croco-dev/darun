import { index, pgTable, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const productResearchJobs = pgTable(
  'product_research_jobs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    requestKey: text('request_key').notNull().unique(),
    officialUrl: text('official_url').notNull(),
    status: text('status').notNull().default('pending'),
    stage: text('stage'),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    resultJson: text('result_json'),
    sourceSnapshotHash: text('source_snapshot_hash'),
    promptVersion: text('prompt_version'),
    model: text('model'),
    leaseToken: text('lease_token'),
    leaseUntil: timestamp('lease_until'),
    attemptCount: integer('attempt_count').notNull().default(0),
    materializedProductId: text('materialized_product_id'),
    appliedAt: timestamp('applied_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    requestKeyIdx: index('product_research_jobs_request_key_idx').on(table.requestKey),
  })
);

export type ProductResearchJobRow = typeof productResearchJobs.$inferSelect;
export type InsertProductResearchJobRow = typeof productResearchJobs.$inferInsert;
