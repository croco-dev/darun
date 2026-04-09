import { pgTable, varchar, timestamp, unique, index } from 'drizzle-orm/pg-core';
import { ulid } from 'ulid';

export const voteRecords = pgTable(
  'vote_records',
  {
    id: varchar('id', { length: 26 }).primaryKey().$default(ulid),
    targetId: varchar('target_id', { length: 26 }).notNull(),
    voterIpHash: varchar('voter_ip_hash', { length: 64 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  table => ({
    targetIpUnique: unique('vote_records_target_ip_unique').on(table.targetId, table.voterIpHash),
    ipTimeIdx: index('vote_records_ip_time_idx').on(table.voterIpHash, table.createdAt),
  })
);
