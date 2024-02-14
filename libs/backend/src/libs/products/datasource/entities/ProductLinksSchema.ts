import { sql } from 'drizzle-orm';
import { datetime, mysqlTable, varchar } from 'drizzle-orm/mysql-core';
import { ulid } from 'ulid';
export const productLinks = mysqlTable('product_links', {
  id: varchar('id', { length: 26 }).primaryKey().$default(ulid),
  productId: varchar('product_id', { length: 26 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  iconUrl: varchar('icon_url', { length: 255 }).notNull(),
  link: varchar('link', { length: 255 }).notNull(),
  displayLink: varchar('display_link', { length: 100 }).notNull(),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
