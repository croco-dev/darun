import { sql } from 'drizzle-orm';
import { pgTable, varchar, timestamp, integer, check } from 'drizzle-orm/pg-core';
import { ulid } from 'ulid';

export const productScreenshots = pgTable(
  'product_screenshots',
  {
    id: varchar('id', { length: 26 }).primaryKey().$default(ulid),
    productId: varchar('product_id', { length: 26 }).notNull(),
    imageUrl: varchar('image_url', { length: 255 }).notNull(),
    imageAlt: varchar('image_alt', { length: 100 }).notNull(),
    title: varchar('title', { length: 100 }),
    platform: varchar('platform', { length: 16 }),
    screenType: varchar('screen_type', { length: 32 }),
    priority: integer('priority').default(0).notNull(),
    createdAt: timestamp('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  table => [
    check(
      'product_screenshots_platform_check',
      sql`${table.platform} IS NULL OR ${table.platform} IN ('WEB', 'IOS', 'ANDROID')`
    ),
    check(
      'product_screenshots_screen_type_check',
      sql`${table.screenType} IS NULL OR ${table.screenType} IN ('HOME', 'ONBOARDING', 'SIGN_UP', 'SIGN_IN', 'SEARCH', 'LIST', 'DETAIL', 'CHECKOUT', 'SETTINGS', 'OTHER')`
    ),
  ]
);
