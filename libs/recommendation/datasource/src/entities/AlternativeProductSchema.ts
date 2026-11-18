import { sql } from 'drizzle-orm';
import { check, pgTable, primaryKey, unique, varchar, timestamp } from 'drizzle-orm/pg-core';
import { ulid } from 'ulid';

export const alternativeProducts = pgTable(
  'alternative_products',
  {
    id: varchar('id', { length: 26 }).primaryKey().$default(ulid),
    productId: varchar('product_id', { length: 26 }).notNull(),
    alternativeProductId: varchar('alternative_product_id', { length: 26 }).notNull(),
    createdAt: timestamp('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  alternativeProducts => [
    unique('alternative_products_product_id_alt_product_id_unique').on(
      alternativeProducts.productId,
      alternativeProducts.alternativeProductId
    ),
  ]
);

export const alternativeProductExclusions = pgTable(
  'alternative_product_exclusions',
  {
    productId: varchar('product_id', { length: 26 }).notNull(),
    alternativeProductId: varchar('alternative_product_id', { length: 26 }).notNull(),
    note: varchar('note', { length: 500 }),
  },
  table => [
    primaryKey({ columns: [table.productId, table.alternativeProductId] }),
    check('alternative_product_exclusions_distinct_products', sql`${table.productId} <> ${table.alternativeProductId}`),
  ]
);
