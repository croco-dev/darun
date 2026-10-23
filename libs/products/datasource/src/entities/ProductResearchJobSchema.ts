import { index, pgTable, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';

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
    runNotBefore: timestamp('run_not_before').defaultNow().notNull(),
    nextDispatchAt: timestamp('next_dispatch_at').defaultNow().notNull(),
    retryOfJobId: text('retry_of_job_id'),
    materializedProductId: text('materialized_product_id'),
    appliedAt: timestamp('applied_at'),
    reviewedInput: jsonb('reviewed_input').$type<{
      name: string;
      slug: string;
      summary: string;
      logoUrl: string;
      officialUrl: string;
      categoryIds: string[];
      features: { name: string; summary: string; emoji: string }[];
      tags: string[];
    }>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    requestKeyIdx: index('product_research_jobs_request_key_idx').on(table.requestKey),
  })
);

export type ProductResearchJobRow = typeof productResearchJobs.$inferSelect;
export type InsertProductResearchJobRow = typeof productResearchJobs.$inferInsert;
