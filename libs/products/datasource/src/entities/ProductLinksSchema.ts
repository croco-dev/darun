import { ProductLinkRole } from '@darun/products-domain/link';
import { sql } from 'drizzle-orm';
import { boolean, pgEnum, pgTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { ulid } from 'ulid';

export const productLinkRoleEnum = pgEnum('product_link_role', ProductLinkRole);

export const productLinks = pgTable(
  'product_links',
  {
    id: varchar('id', { length: 26 }).primaryKey().$default(ulid),
    productId: varchar('product_id', { length: 26 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    iconUrl: varchar('icon_url', { length: 255 }).notNull(),
    link: varchar('link', { length: 255 }).notNull(),
    displayLink: varchar('display_link', { length: 100 }).notNull(),
    role: productLinkRoleEnum('role'),
    isDesignatedPrimary: boolean('is_designated_primary').notNull().default(false),
    createdAt: timestamp('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  table => [
    uniqueIndex('product_links_designated_primary_unique')
      .on(table.productId)
      .where(sql`${table.isDesignatedPrimary}`),
  ]
);
