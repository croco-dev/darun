import { sql } from 'drizzle-orm';
import { pgTable, varchar, timestamp } from 'drizzle-orm/pg-core';
import { ulid } from 'ulid';

export const alternativeProducts = pgTable('alternative_products', {
  id: varchar('id', { length: 26 }).primaryKey().$default(ulid),
  productId: varchar('product_id', { length: 26 }).notNull(),
  alternativeProductId: varchar('alternative_product_id', { length: 26 }).notNull(),
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
