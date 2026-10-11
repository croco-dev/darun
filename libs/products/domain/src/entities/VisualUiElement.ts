import { productInvalidArgs } from '../errors/productError';

/**
 * 스크린샷당 복수 태그 가능한 UI 요소 닫힌 집합.
 * 조인 테이블에 저장되는 코드이며, 화면 탐색 필터의 기준 어휘다.
 */
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

export function isVisualUiElement(value: string): value is VisualUiElement {
  return (VISUAL_UI_ELEMENTS as readonly string[]).includes(value);
}

/**
 * 외부 입력(관리자 입력·조인 테이블 행)을 정규화한다.
 * null/undefined/빈 배열은 빈 배열로, 중복은 첫 등장 순서로 제거한다.
 * 닫힌 집합 밖의 값이나 상한 초과는 저장 전에 거절한다.
 */
export function normalizeVisualUiElements(values: readonly string[] | null | undefined): VisualUiElement[] {
  if (values === null || values === undefined) {
    return [];
  }
  const normalized: VisualUiElement[] = [];
  for (const value of values) {
    if (!isVisualUiElement(value)) {
      throw productInvalidArgs('지원하지 않는 UI 요소 값입니다.');
    }
    if (!normalized.includes(value)) {
      normalized.push(value);
    }
  }
  if (normalized.length > VISUAL_UI_ELEMENTS_MAX_COUNT) {
    throw productInvalidArgs('UI 요소는 최대 10개까지 지정할 수 있습니다.');
  }
  return normalized;
}
