import { registerEnumType } from 'type-graphql';

export enum VisualFlowTypeGraph {
  ONBOARDING = 'ONBOARDING',
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SEARCH = 'SEARCH',
  CHECKOUT = 'CHECKOUT',
  SETTINGS = 'SETTINGS',
  OTHER = 'OTHER',
}

registerEnumType(VisualFlowTypeGraph, {
  name: 'VisualFlowType',
  description: 'UX 플로가 담고 있는 흐름의 종류',
});
