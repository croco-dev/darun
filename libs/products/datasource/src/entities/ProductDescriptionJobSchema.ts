import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

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
    baseDescriptionHash: text('base_description_hash'),
    candidateDocument: text('candidate_document'),
    candidateHtml: text('candidate_html'),
    writerModel: text('writer_model'),
    reviewerModel: text('reviewer_model'),
    writerPromptVersion: text('writer_prompt_version'),
    reviewerPromptVersion: text('reviewer_prompt_version'),
    rendererVersion: text('renderer_version'),
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
