import { sql } from 'drizzle-orm';
import { datetime, mysqlTable, varchar } from 'drizzle-orm/mysql-core';
import { ulid } from 'ulid';

export const productTags = mysqlTable('product_tags', {
  id: varchar('id', { length: 26 }).primaryKey().$default(ulid),
  productId: varchar('product_id', { length: 26 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
