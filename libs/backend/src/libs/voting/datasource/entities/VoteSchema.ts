import { sql } from 'drizzle-orm';
import { pgTable, varchar, timestamp, bigint, index } from 'drizzle-orm/pg-core';
import { ulid } from 'ulid';

export const votes = pgTable(
  'votes',
  {
    id: varchar('id', { length: 26 }).primaryKey().$default(ulid),
    targetId: varchar('target_id', { length: 26 }).notNull().unique(),
    count: bigint('count', { mode: 'number' }).notNull().default(0),
    createdAt: timestamp('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  table => ({
    countIdx: index('votes_count_idx').on(table.count),
  })
);
