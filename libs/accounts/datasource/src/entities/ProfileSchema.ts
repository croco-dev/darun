import { sql } from 'drizzle-orm';
import { pgTable, varchar, timestamp } from 'drizzle-orm/pg-core';
import { ulid } from 'ulid';

export const profiles = pgTable('profiles', {
  id: varchar('id', { length: 26 }).primaryKey().$default(ulid),
  userId: varchar('user_id', { length: 50 }).notNull(),
  displayName: varchar('display_name', { length: 50 }).notNull(),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
