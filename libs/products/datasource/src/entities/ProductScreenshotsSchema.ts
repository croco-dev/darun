import { sql } from 'drizzle-orm';
import { pgTable, varchar, timestamp, integer } from 'drizzle-orm/pg-core';
import { ulid } from 'ulid';

export const productScreenshots = pgTable('product_screenshots', {
  id: varchar('id', { length: 26 }).primaryKey().$default(ulid),
  productId: varchar('product_id', { length: 26 }).notNull(),
  imageUrl: varchar('image_url', { length: 255 }).notNull(),
  imageAlt: varchar('image_alt', { length: 100 }).notNull(),
  priority: integer('priority').default(0).notNull(),
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
