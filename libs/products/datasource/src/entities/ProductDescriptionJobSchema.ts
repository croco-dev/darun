import { index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const productDescriptionJobs = pgTable(
  'product_description_jobs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: text('product_id').notNull(),
    status: text('status').notNull().default('pending'),
    message: text('message'),
    error: text('error'),
    evidenceHash: text('evidence_hash'),
    evidenceHashVersion: text('evidence_hash_version'),
    baseDescriptionHash: text('base_description_hash'),
    candidateDocument: text('candidate_document'),
    candidateHtml: text('candidate_html'),
    writerModel: text('writer_model'),
    reviewerModel: text('reviewer_model'),
    writerPromptVersion: text('writer_prompt_version'),
    reviewerPromptVersion: text('reviewer_prompt_version'),
    rendererVersion: text('renderer_version'),
    leaseToken: text('lease_token'),
    leaseUntil: timestamp('lease_until'),
    attemptCount: integer('attempt_count').notNull().default(0),
    runNotBefore: timestamp('run_not_before').defaultNow().notNull(),
    nextDispatchAt: timestamp('next_dispatch_at').defaultNow().notNull(),
    retryOfJobId: text('retry_of_job_id'),
    appliedAt: timestamp('applied_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    productIdx: index('product_description_jobs_product_idx').on(table.productId),
    statusIdx: index('product_description_jobs_status_idx').on(table.status),
  })
);

export type ProductDescriptionJobRow = typeof productDescriptionJobs.$inferSelect;
export type InsertProductDescriptionJobRow = typeof productDescriptionJobs.$inferInsert;
