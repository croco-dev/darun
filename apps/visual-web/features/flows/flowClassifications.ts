import type { VisualFlowType, VisualPlatform } from '@darun/provider-graphql';

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

export const VISUAL_PLATFORM_LABELS: Record<VisualPlatform, string> = {
  WEB: '웹',
  IOS: 'iOS',
  ANDROID: '안드로이드',
};

export const VISUAL_PLATFORM_OPTIONS: Array<{ value: VisualPlatform; label: string }> = (
  Object.keys(VISUAL_PLATFORM_LABELS) as VisualPlatform[]
).map(value => ({ value, label: VISUAL_PLATFORM_LABELS[value] }));

export function isVisualPlatformValue(value: string): value is VisualPlatform {
  return value in VISUAL_PLATFORM_LABELS;
}

export function isVisualFlowTypeValue(value: string): value is VisualFlowType {
  return value in VISUAL_FLOW_TYPE_LABELS;
}
