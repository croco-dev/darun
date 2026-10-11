import type { VisualFlowType, VisualPlatform, VisualScreenType } from '@darun/provider-graphql';

export const VISUAL_PLATFORM_LABELS = {
  WEB: '웹',
  IOS: 'iOS',
  ANDROID: 'Android',
} as const;

export type VisualPlatformValue = keyof typeof VISUAL_PLATFORM_LABELS;

export const VISUAL_PLATFORM_OPTIONS = (Object.keys(VISUAL_PLATFORM_LABELS) as VisualPlatformValue[]).map(value => ({
  value,
  label: VISUAL_PLATFORM_LABELS[value],
}));

export const VISUAL_SCREEN_TYPE_LABELS = {
  HOME: '홈',
  ONBOARDING: '온보딩',
  SIGN_UP: '회원가입',
  SIGN_IN: '로그인',
  SEARCH: '검색',
  LIST: '목록',
  DETAIL: '상세',
  CHECKOUT: '결제',
  SETTINGS: '설정',
  OTHER: '기타',
} as const;

export type VisualScreenTypeValue = keyof typeof VISUAL_SCREEN_TYPE_LABELS;

export const VISUAL_SCREEN_TYPE_OPTIONS = (Object.keys(VISUAL_SCREEN_TYPE_LABELS) as VisualScreenTypeValue[]).map(
  value => ({ value, label: VISUAL_SCREEN_TYPE_LABELS[value] })
);

export const VISUAL_FLOW_TYPE_LABELS: Record<VisualFlowType, string> = {
  ONBOARDING: '온보딩',
  SIGN_UP: '회원가입',
  SIGN_IN: '로그인',
  SEARCH: '검색',
  CHECKOUT: '결제',
  SETTINGS: '설정',
  OTHER: '기타',
};

export const VISUAL_FLOW_TYPE_OPTIONS: Array<{ value: VisualFlowType; label: string }> = (
  Object.keys(VISUAL_FLOW_TYPE_LABELS) as VisualFlowType[]
).map(value => ({ value, label: VISUAL_FLOW_TYPE_LABELS[value] }));

export const UNCLASSIFIED_LABEL = '미분류';

export const VISUAL_UI_ELEMENT_LABELS = {
  AVATAR: '아바타',
  BADGE: '배지',
  BOTTOM_SHEET: '바텀시트',
  BUTTON: '버튼',
  CALENDAR: '달력',
  CARD: '카드',
  CAROUSEL: '캐러셀',
  DROPDOWN: '드롭다운',
  INPUT: '입력',
  LIST: '리스트',
  MAP: '지도',
  MODAL: '모달',
  NAVIGATION_BAR: '내비게이션 바',
  PAGINATION: '페이지네이션',
  PROGRESS: '프로그레스',
  SEARCH_BAR: '검색 바',
  STEPPER: '스테퍼',
  TAB_BAR: '탭 바',
  TABLE: '테이블',
  TOGGLE: '토글',
} as const satisfies Record<string, string>;

export type VisualUiElementValue = keyof typeof VISUAL_UI_ELEMENT_LABELS;

export const VISUAL_UI_ELEMENT_OPTIONS = (Object.keys(VISUAL_UI_ELEMENT_LABELS) as VisualUiElementValue[]).map(
  value => ({ value, label: VISUAL_UI_ELEMENT_LABELS[value] })
);

export function isVisualPlatformValue(value: string | null | undefined): value is VisualPlatformValue & VisualPlatform {
  return value !== null && value !== undefined && Object.prototype.hasOwnProperty.call(VISUAL_PLATFORM_LABELS, value);
}

export function isVisualScreenTypeValue(
  value: string | null | undefined
): value is VisualScreenTypeValue & VisualScreenType {
  return (
    value !== null && value !== undefined && Object.prototype.hasOwnProperty.call(VISUAL_SCREEN_TYPE_LABELS, value)
  );
}

export function isVisualFlowTypeValue(value: string | null | undefined): value is VisualFlowType {
  return value !== null && value !== undefined && Object.prototype.hasOwnProperty.call(VISUAL_FLOW_TYPE_LABELS, value);
}

export function isVisualUiElementValue(value: string | null | undefined): value is VisualUiElementValue {
  return value !== null && value !== undefined && Object.prototype.hasOwnProperty.call(VISUAL_UI_ELEMENT_LABELS, value);
}

export function readVisualUiElementParam(searchParams: URLSearchParams): VisualUiElementValue | null {
  const rawElement = searchParams.get('element');
  return isVisualUiElementValue(rawElement) ? rawElement : null;
}

export function buildVisualUiElementVariables(element: VisualUiElementValue | null): {
  uiElements: VisualUiElementValue[] | null;
} {
  return { uiElements: element !== null ? [element] : null };
}

export function resolveVisualPlatform(value: unknown): VisualPlatform {
  if (typeof value === 'string' && isVisualPlatformValue(value)) {
    return value;
  }
  console.warn('Unknown VisualPlatform value, falling back to WEB:', value);
  return 'WEB';
}

export function resolveVisualScreenType(value: unknown): VisualScreenType {
  if (typeof value === 'string' && isVisualScreenTypeValue(value)) {
    return value;
  }
  console.warn('Unknown VisualScreenType value, falling back to OTHER:', value);
  return 'OTHER';
}

export function resolveVisualFlowType(value: unknown): VisualFlowType {
  if (typeof value === 'string' && isVisualFlowTypeValue(value)) {
    return value;
  }
  console.warn('Unknown VisualFlowType value, falling back to OTHER:', value);
  return 'OTHER';
}
