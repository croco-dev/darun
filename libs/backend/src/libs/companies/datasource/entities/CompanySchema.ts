import { sql } from 'drizzle-orm';
import { pgTable, varchar, timestamp } from 'drizzle-orm/pg-core';
import { ulid } from 'ulid';

export const companies = pgTable('companies', {
  id: varchar('id', { length: 26 }).primaryKey().$default(ulid),
  name: varchar('name', { length: 100 }).notNull(),
  address: varchar('address', { length: 200 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  startAt: timestamp('start_at'),
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
