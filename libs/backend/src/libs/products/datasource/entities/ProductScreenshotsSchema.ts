import { sql } from 'drizzle-orm';
import { datetime, int, mysqlTable, varchar } from 'drizzle-orm/mysql-core';
import { ulid } from 'ulid';

export const productScreenshots = mysqlTable('product_screenshots', {
  id: varchar('id', { length: 26 }).primaryKey().$default(ulid),
  productId: varchar('product_id', { length: 26 }).notNull(),
  imageUrl: varchar('image_url', { length: 255 }).notNull(),
  imageAlt: varchar('image_alt', { length: 100 }).notNull(),
  priority: int('priority').default(0).notNull(),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
