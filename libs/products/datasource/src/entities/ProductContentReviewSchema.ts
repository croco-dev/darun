import { bigint, date, index, pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { products } from './ProductSchema';

export const productContentReviews = pgTable(
  'product_content_reviews',
  {
    id: bigint('id', { mode: 'bigint' }).primaryKey().generatedAlwaysAsIdentity(),
    productId: varchar('product_id', { length: 26 })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    reviewedRevision: bigint('reviewed_revision', { mode: 'bigint' }).notNull(),
    reviewerId: text('reviewer_id').notNull(),
    requestId: uuid('request_id').notNull(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }).notNull().defaultNow(),
    memo: text('memo').notNull(),
    referenceUrl: text('reference_url'),
    nextReviewOn: date('next_review_on'),
  },
  table => [
    unique('product_content_reviews_request_unique').on(table.productId, table.reviewerId, table.requestId),
    index('product_content_reviews_product_latest_idx').on(table.productId, table.id.desc()),
  ]
);
