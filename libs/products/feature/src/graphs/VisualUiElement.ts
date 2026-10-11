import { registerEnumType } from 'type-graphql';

export enum VisualUiElementGraph {
  AVATAR = 'AVATAR',
  BADGE = 'BADGE',
  BOTTOM_SHEET = 'BOTTOM_SHEET',
  BUTTON = 'BUTTON',
  CALENDAR = 'CALENDAR',
  CARD = 'CARD',
  CAROUSEL = 'CAROUSEL',
  DROPDOWN = 'DROPDOWN',
  INPUT = 'INPUT',
  LIST = 'LIST',
  MAP = 'MAP',
  MODAL = 'MODAL',
  NAVIGATION_BAR = 'NAVIGATION_BAR',
  PAGINATION = 'PAGINATION',
  PROGRESS = 'PROGRESS',
  SEARCH_BAR = 'SEARCH_BAR',
  STEPPER = 'STEPPER',
  TAB_BAR = 'TAB_BAR',
  TABLE = 'TABLE',
  TOGGLE = 'TOGGLE',
}

registerEnumType(VisualUiElementGraph, {
  name: 'VisualUiElement',
  description: '스크린샷에 달 수 있는 UI 요소 태그',
});
