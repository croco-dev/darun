import { sql } from 'drizzle-orm';
import { integer, pgTable } from 'drizzle-orm/pg-core';
import { timestamp, varchar } from 'drizzle-orm/pg-core';
import { ulid } from 'ulid';

export const tags = pgTable('tags', {
  id: varchar('id', { length: 26 }).primaryKey().$default(ulid),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  count: integer('count').notNull().default(0),
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
