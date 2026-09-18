import { registerEnumType } from 'type-graphql';

export enum VisualPlatformGraph {
  WEB = 'WEB',
  IOS = 'IOS',
  ANDROID = 'ANDROID',
}

registerEnumType(VisualPlatformGraph, {
  name: 'VisualPlatform',
  description: '스크린샷이 속한 제품 플랫폼',
});
