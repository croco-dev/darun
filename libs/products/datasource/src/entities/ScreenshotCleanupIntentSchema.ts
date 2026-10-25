import { index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// No screenshot FK: the durable cleanup must survive deletion of its source row.
export const screenshotCleanupIntents = pgTable(
  'screenshot_cleanup_intents',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    screenshotId: text('screenshot_id').notNull().unique(),
    imageUrl: text('image_url').notNull(),
    status: text('status').$type<'pending' | 'in_progress' | 'completed'>().notNull().default('pending'),
    attemptCount: integer('attempt_count').notNull().default(0),
    error: text('error'),
    leaseToken: text('lease_token'),
    leaseUntil: timestamp('lease_until'),
    retryAfter: timestamp('retry_after').notNull().defaultNow(),
    dispatchAfter: timestamp('dispatch_after').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [index('screenshot_cleanup_recovery').on(table.status, table.retryAfter)]
);
