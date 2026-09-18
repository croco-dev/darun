import { registerEnumType } from 'type-graphql';

export enum VisualScreenTypeGraph {
  HOME = 'HOME',
  ONBOARDING = 'ONBOARDING',
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SEARCH = 'SEARCH',
  LIST = 'LIST',
  DETAIL = 'DETAIL',
  CHECKOUT = 'CHECKOUT',
  SETTINGS = 'SETTINGS',
  OTHER = 'OTHER',
}

registerEnumType(VisualScreenTypeGraph, {
  name: 'VisualScreenType',
  description: '스크린샷이 담고 있는 화면의 종류',
});
