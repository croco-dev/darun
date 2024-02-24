import { sql } from 'drizzle-orm';
import { datetime, mysqlTable, varchar } from 'drizzle-orm/mysql-core';
import { ulid } from 'ulid';

export const companies = mysqlTable('companies', {
  id: varchar('id', { length: 26 }).primaryKey().$default(ulid),
  name: varchar('name', { length: 100 }).notNull(),
  address: varchar('address', { length: 200 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  size: varchar('size', { length: 10 }).notNull(),
  region: varchar('region', { length: 20 }).notNull(),
  startAt: datetime('start_at').notNull(),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
