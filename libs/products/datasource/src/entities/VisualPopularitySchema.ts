import { sql } from 'drizzle-orm';
import { check, index, pgTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { ulid } from 'ulid';
import { productFlows } from './ProductFlowsSchema';
import { productScreenshots } from './ProductScreenshotsSchema';

/**
 * Visual 조회 기록 (M2).
 * IP 원문 저장 금지: sha256(ip + salt) 해시만 저장한다.
 * 화면·플로 중 정확히 하나만 참조한다.
 */
export const visualViewEvents = pgTable(
  'visual_view_events',
  {
    id: varchar('id', { length: 26 }).primaryKey().$default(ulid),
    screenshotId: varchar('screenshot_id', { length: 26 }).references(() => productScreenshots.id, {
      onDelete: 'cascade',
    }),
    flowId: varchar('flow_id', { length: 26 }).references(() => productFlows.id, { onDelete: 'cascade' }),
    viewerHash: varchar('viewer_hash', { length: 64 }).notNull(),
    createdAt: timestamp('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  table => [
    check('visual_view_events_target_check', sql`num_nonnulls(${table.screenshotId}, ${table.flowId}) = 1`),
    index('visual_view_events_screenshot_time_idx').on(table.screenshotId, table.createdAt),
    index('visual_view_events_flow_time_idx').on(table.flowId, table.createdAt),
  ]
);

/**
 * Visual 저장 (M3). 로그인 필수, 화면·플로 둘 다.
 * 화면·플로 중 정확히 하나만 참조하고, 동일 유저 중복 저장을 막는다.
 */
export const visualSaves = pgTable(
  'visual_saves',
  {
    id: varchar('id', { length: 26 }).primaryKey().$default(ulid),
    userId: varchar('user_id', { length: 26 }).notNull(),
    screenshotId: varchar('screenshot_id', { length: 26 }).references(() => productScreenshots.id, {
      onDelete: 'cascade',
    }),
    flowId: varchar('flow_id', { length: 26 }).references(() => productFlows.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  table => [
    check('visual_saves_target_check', sql`num_nonnulls(${table.screenshotId}, ${table.flowId}) = 1`),
    uniqueIndex('visual_saves_user_screenshot_unique').on(table.userId, table.screenshotId),
    uniqueIndex('visual_saves_user_flow_unique').on(table.userId, table.flowId),
    index('visual_saves_screenshot_idx').on(table.screenshotId),
    index('visual_saves_flow_idx').on(table.flowId),
    index('visual_saves_user_idx').on(table.userId),
  ]
);