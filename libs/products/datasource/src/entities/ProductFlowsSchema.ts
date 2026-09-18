import { sql } from 'drizzle-orm';
import { pgTable, varchar, timestamp, text, integer, primaryKey, check, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { ulid } from 'ulid';
import { products } from './ProductSchema';
import { productScreenshots } from './ProductScreenshotsSchema';

export const productFlows = pgTable(
  'product_flows',
  {
    id: varchar('id', { length: 26 }).primaryKey().$default(ulid),
    productId: varchar('product_id', { length: 26 })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 100 }).notNull(),
    description: text('description').notNull().default(''),
    platform: varchar('platform', { length: 16 }).notNull(),
    flowType: varchar('flow_type', { length: 32 }).notNull(),
    createdAt: timestamp('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  table => [
    index('product_flows_product_id_idx').on(table.productId),
    check('product_flows_platform_check', sql`${table.platform} IN ('WEB', 'IOS', 'ANDROID')`),
    check(
      'product_flows_flow_type_check',
      sql`${table.flowType} IN ('ONBOARDING', 'SIGN_UP', 'SIGN_IN', 'SEARCH', 'CHECKOUT', 'SETTINGS', 'OTHER')`
    ),
  ]
);

export const productFlowSteps = pgTable(
  'product_flow_steps',
  {
    flowId: varchar('flow_id', { length: 26 })
      .notNull()
      .references(() => productFlows.id, { onDelete: 'cascade' }),
    screenshotId: varchar('screenshot_id', { length: 26 })
      .notNull()
      .references(() => productScreenshots.id, { onDelete: 'restrict' }),
    position: integer('position').notNull(),
    caption: varchar('caption', { length: 300 }).notNull().default(''),
  },
  table => [
    primaryKey({ columns: [table.flowId, table.position] }),
    uniqueIndex('product_flow_steps_flow_id_screenshot_id_key').on(table.flowId, table.screenshotId),
    index('product_flow_steps_screenshot_id_idx').on(table.screenshotId),
    check('product_flow_steps_position_check', sql`${table.position} >= 0`),
  ]
);
