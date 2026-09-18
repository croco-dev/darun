export const VISUAL_FLOW_TYPES = [
  'ONBOARDING',
  'SIGN_UP',
  'SIGN_IN',
  'SEARCH',
  'CHECKOUT',
  'SETTINGS',
  'OTHER',
] as const;
export type VisualFlowType = (typeof VISUAL_FLOW_TYPES)[number];

export function isVisualFlowType(value: string): value is VisualFlowType {
  return (VISUAL_FLOW_TYPES as readonly string[]).includes(value);
}
