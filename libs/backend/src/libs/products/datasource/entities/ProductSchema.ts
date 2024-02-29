import { sql } from 'drizzle-orm';
import { datetime, mysqlTable, text, varchar } from 'drizzle-orm/mysql-core';
import { ulid } from 'ulid';
export const products = mysqlTable('products', {
  id: varchar('id', { length: 26 }).primaryKey().$default(ulid),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  summary: varchar('summary', { length: 255 }).notNull(),
  description: text('description'),
  logoUrl: varchar('logo_url', { length: 255 }).notNull(),
  ownedCompanyId: varchar('owned_company_id', { length: 26 }),
  publishedAt: datetime('published_at'),
  updatedAt: datetime('updated_at'),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
