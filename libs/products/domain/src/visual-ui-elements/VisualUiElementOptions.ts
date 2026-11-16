/** 스크린샷에 저장되고 Visual 필터에 사용되는 UI 요소 코드. */
export const VISUAL_UI_ELEMENTS = [
  'AVATAR',
  'BADGE',
  'BOTTOM_SHEET',
  'BUTTON',
  'CALENDAR',
  'CARD',
  'CAROUSEL',
  'DROPDOWN',
  'INPUT',
  'LIST',
  'MAP',
  'MODAL',
  'NAVIGATION_BAR',
  'PAGINATION',
  'PROGRESS',
  'SEARCH_BAR',
  'STEPPER',
  'TAB_BAR',
  'TABLE',
  'TOGGLE',
] as const;
export type VisualUiElement = (typeof VISUAL_UI_ELEMENTS)[number];

/** 스크린샷 하나에 달 수 있는 UI 요소 태그 수 상한. */
export const VISUAL_UI_ELEMENTS_MAX_COUNT = 10;
