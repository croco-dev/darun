import { sql } from 'drizzle-orm';
import { datetime, mysqlTable, varchar } from 'drizzle-orm/mysql-core';
import { ulid } from 'ulid';

export const productFeatures = mysqlTable('product_features', {
  id: varchar('id', { length: 26 }).primaryKey().$default(ulid),
  productId: varchar('product_id', { length: 26 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  summary: varchar('summary', { length: 255 }),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
