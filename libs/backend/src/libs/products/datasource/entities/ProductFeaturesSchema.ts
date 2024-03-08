import { sql } from 'drizzle-orm';
import { pgTable, varchar, timestamp } from 'drizzle-orm/pg-core';
import { ulid } from 'ulid';

export const productFeatures = pgTable('product_features', {
  id: varchar('id', { length: 26 }).primaryKey().$default(ulid),
  productId: varchar('product_id', { length: 26 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  emoji: varchar('emoji', { length: 30 }).notNull(),
  summary: varchar('summary', { length: 255 }),
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
