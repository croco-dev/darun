import { sql } from 'drizzle-orm';
import { check, index, pgTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { ulid } from 'ulid';
import { productScreenshots } from './ProductScreenshotsSchema';

/**
 * 스크린샷 UI 요소 태그 조인 테이블.
 * element는 도메인 VisualUiElement 닫힌 집합 코드이며, 화면 탐색 필터의 기준 어휘다.
 * 허용 코드는 CHECK 제약으로도 강제한다(VisualUiElement 목록과 동기 유지).
 */
export const productScreenshotUiElements = pgTable(
  'product_screenshot_ui_elements',
  {
    id: varchar('id', { length: 26 }).primaryKey().$default(ulid),
    screenshotId: varchar('screenshot_id', { length: 26 })
      .notNull()
      .references(() => productScreenshots.id, { onDelete: 'cascade' }),
    element: varchar('element', { length: 32 }).notNull(),
    createdAt: timestamp('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  table => [
    check(
      'product_screenshot_ui_elements_element_check',
      sql`${table.element} IN ('AVATAR', 'BADGE', 'BOTTOM_SHEET', 'BUTTON', 'CALENDAR', 'CARD', 'CAROUSEL', 'DROPDOWN', 'INPUT', 'LIST', 'MAP', 'MODAL', 'NAVIGATION_BAR', 'PAGINATION', 'PROGRESS', 'SEARCH_BAR', 'STEPPER', 'TAB_BAR', 'TABLE', 'TOGGLE')`
    ),
    uniqueIndex('product_screenshot_ui_elements_screenshot_element_unique').on(table.screenshotId, table.element),
    index('product_screenshot_ui_elements_element_idx').on(table.element),
  ]
);
