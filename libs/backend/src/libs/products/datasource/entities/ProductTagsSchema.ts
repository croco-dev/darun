import { sql } from 'drizzle-orm';
import { pgTable, varchar } from 'drizzle-orm/pg-core';
import { timestamp } from 'drizzle-orm/pg-core';
import { ulid } from 'ulid';
import { products } from './ProductSchema';
import { tags } from './TagSchema';

export const productTags = pgTable('product_tags', {
  id: varchar('id', { length: 26 }).primaryKey().$default(ulid),
  productId: varchar('product_id', { length: 26 })
    .notNull()
    .references(() => products.id),
  tagId: varchar('tag_id', { length: 26 })
    .notNull()
    .references(() => tags.id),
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
