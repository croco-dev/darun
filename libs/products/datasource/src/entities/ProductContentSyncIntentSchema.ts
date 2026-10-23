import { bigint, index, integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { products } from './ProductSchema';

export const productContentSyncIntents = pgTable(
  'product_content_sync_intents',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    sourceRevision: bigint('source_revision', { mode: 'bigint' }).notNull(),
    kind: text('kind').$type<'search' | 'translation'>().notNull(),
    status: text('status')
      .$type<'pending' | 'in_progress' | 'completed' | 'superseded' | 'failed'>()
      .notNull()
      .default('pending'),
    attemptCount: integer('attempt_count').notNull().default(0),
    error: text('error'),
    translationJobId: text('translation_job_id'),
    leaseToken: text('lease_token'),
    leaseUntil: timestamp('lease_until'),
    retryAfter: timestamp('retry_after').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    dispatchAfter: timestamp('dispatch_after').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [
    uniqueIndex('product_content_sync_identity').on(table.productId, table.sourceRevision, table.kind),
    index('product_content_sync_recovery').on(table.status, table.retryAfter),
  ]
);
