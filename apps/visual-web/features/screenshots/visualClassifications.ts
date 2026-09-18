export const VISUAL_PLATFORM_LABELS = {
  WEB: '웹',
  IOS: 'iOS',
  ANDROID: 'Android',
} as const;

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

export const UNCLASSIFIED_LABEL = '미분류';

export const VISUAL_PLATFORM_OPTIONS = [
  { value: 'WEB', label: VISUAL_PLATFORM_LABELS.WEB },
  { value: 'IOS', label: VISUAL_PLATFORM_LABELS.IOS },
  { value: 'ANDROID', label: VISUAL_PLATFORM_LABELS.ANDROID },
] as const;

export const VISUAL_SCREEN_TYPE_OPTIONS = (
  Object.keys(VISUAL_SCREEN_TYPE_LABELS) as Array<keyof typeof VISUAL_SCREEN_TYPE_LABELS>
).map(value => ({ value, label: VISUAL_SCREEN_TYPE_LABELS[value] }));

export function isVisualPlatformValue(value: string | null | undefined): value is keyof typeof VISUAL_PLATFORM_LABELS {
  return value !== null && value !== undefined && value in VISUAL_PLATFORM_LABELS;
}

export function isVisualScreenTypeValue(
  value: string | null | undefined
): value is keyof typeof VISUAL_SCREEN_TYPE_LABELS {
  return value !== null && value !== undefined && value in VISUAL_SCREEN_TYPE_LABELS;
}
