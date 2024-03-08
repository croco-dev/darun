import { sql } from 'drizzle-orm';
import { pgTable, integer, varchar, timestamp } from 'drizzle-orm/pg-core';
import { ulid } from 'ulid';

export const productFeatureScreenshots = pgTable('product_feature_screenshots', {
  id: varchar('id', { length: 26 }).primaryKey().$default(ulid),
  featureId: varchar('feature_id', { length: 26 }).notNull(),
  productId: varchar('product_id', { length: 26 }).notNull(),
  emoji: varchar('emoji', { length: 30 }).notNull(),
  imageUrl: varchar('image_url', { length: 255 }).notNull(),
  imageAlt: varchar('image_alt', { length: 100 }).notNull(),
  priority: integer('priority').default(0).notNull(),
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
