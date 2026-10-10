import { pgTable, uuid, text, timestamp, boolean, integer, index } from 'drizzle-orm/pg-core';

// 사용자 테이블
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  isAdmin: boolean('is_admin').default(false),
});

// 앱 테이블
export const apps = pgTable(
  'apps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    appStoreId: text('app_store_id').notNull().unique(),
    name: text('name').notNull(),
    description: text('description'),
    iconUrl: text('icon_url'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [index('app_id_idx').on(table.appStoreId)]
);

// 티어 테이블
export const tiers = pgTable('tiers', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id')
    .notNull()
    .references(() => apps.id),
  assignedBy: uuid('assigned_by')
    .notNull()
    .references(() => users.id),
  tier: integer('tier').notNull(), // 1, 2, 3, 또는 0 (티어 없음)
  assignedAt: timestamp('assigned_at').defaultNow(),
  notes: text('notes'),
});

// 메모 테이블
export const memos = pgTable('memos', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id')
    .notNull()
    .references(() => apps.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
