export const VISUAL_PLATFORMS = ['WEB', 'IOS', 'ANDROID'] as const;
export type VisualPlatform = (typeof VISUAL_PLATFORMS)[number];

export const VISUAL_SCREEN_TYPES = [
  'HOME',
  'ONBOARDING',
  'SIGN_UP',
  'SIGN_IN',
  'SEARCH',
  'LIST',
  'DETAIL',
  'CHECKOUT',
  'SETTINGS',
  'OTHER',
] as const;
export type VisualScreenType = (typeof VISUAL_SCREEN_TYPES)[number];

export function isVisualPlatform(value: string): value is VisualPlatform {
  return (VISUAL_PLATFORMS as readonly string[]).includes(value);
}

export function isVisualScreenType(value: string): value is VisualScreenType {
  return (VISUAL_SCREEN_TYPES as readonly string[]).includes(value);
}
