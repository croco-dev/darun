import { pgTable, primaryKey, text, uuid, varchar } from 'drizzle-orm/pg-core';
import { products } from './ProductSchema';

export const productScreenshotRegistrations = pgTable(
  'product_screenshot_registrations',
  {
    productId: varchar('product_id', { length: 26 })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    requestId: uuid('request_id').notNull(),
    // Keep the receipt after screenshot deletion so a delayed replay cannot recreate the row.
    screenshotId: varchar('screenshot_id', { length: 26 }).notNull(),
    inputFingerprint: text('input_fingerprint').notNull(),
  },
  table => [primaryKey({ columns: [table.productId, table.requestId] })]
);
