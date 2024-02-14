import { sql } from 'drizzle-orm';
import { datetime, mysqlTable, text, varchar } from 'drizzle-orm/mysql-core';
import { ulid } from 'ulid';
export const products = mysqlTable('products', {
  id: varchar('id', { length: 26 }).primaryKey().$default(ulid),
  name: varchar('name', { length: 255 }).notNull(),
  summary: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  logoUrl: varchar('logo_url', { length: 255 }).notNull(),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
