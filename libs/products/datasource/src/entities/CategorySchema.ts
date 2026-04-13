import { sql } from 'drizzle-orm';
import { pgTable, varchar, timestamp } from 'drizzle-orm/pg-core';
import { ulid } from 'ulid';

export const categories = pgTable('categories', {
  id: varchar('id', { length: 26 }).primaryKey().$default(ulid),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  labelKo: varchar('label_ko', { length: 100 }).notNull(),
  labelEn: varchar('label_en', { length: 100 }).notNull(),
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
