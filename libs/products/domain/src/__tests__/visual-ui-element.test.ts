import { describe, expect, it } from 'vitest';
import {
  VISUAL_UI_ELEMENTS,
  VISUAL_UI_ELEMENTS_MAX_COUNT,
  isVisualUiElement,
  normalizeVisualUiElements,
  type VisualUiElement,
} from '../entities/VisualUiElement';

describe('VisualUiElement', () => {
  it('닫힌 집합 enum 값을 그대로 유지한다', () => {
    expect([...VISUAL_UI_ELEMENTS]).toEqual([
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
    ]);
    const unique = new Set(VISUAL_UI_ELEMENTS);
    expect(unique.size).toBe(VISUAL_UI_ELEMENTS.length);
  });

  it('집합 내 값은 가드로 판별하고 집합 밖 값은 거짓이다', () => {
    for (const element of VISUAL_UI_ELEMENTS) {
      expect(isVisualUiElement(element)).toBe(true);
    }
    expect(isVisualUiElement('SIDEBAR')).toBe(false);
    expect(isVisualUiElement('button')).toBe(false);
    expect(isVisualUiElement('')).toBe(false);
  });

  it('null·undefined·빈 배열은 빈 배열로 정규화된다', () => {
    expect(normalizeVisualUiElements(null)).toEqual([]);
    expect(normalizeVisualUiElements(undefined)).toEqual([]);
    expect(normalizeVisualUiElements([])).toEqual([]);
  });

  it('중복 입력은 첫 등장 순서대로 제거된다', () => {
    const normalized: VisualUiElement[] = normalizeVisualUiElements(['CARD', 'BUTTON', 'CARD', 'MODAL', 'BUTTON']);
    expect(normalized).toEqual(['CARD', 'BUTTON', 'MODAL']);
  });

  it('집합 밖 값은 product/invalid-args로 거절한다', () => {
    expect(() => normalizeVisualUiElements(['CARD', 'SIDEBAR'])).toThrowError(
      expect.objectContaining({ code: 'product/invalid-args' })
    );
    expect(() => normalizeVisualUiElements(['button'])).toThrowError(
      expect.objectContaining({ code: 'product/invalid-args' })
    );
  });

  it('상한 초과 입력은 product/invalid-args로 거절한다', () => {
    expect(VISUAL_UI_ELEMENTS_MAX_COUNT).toBe(10);
    expect(() => normalizeVisualUiElements([...VISUAL_UI_ELEMENTS])).toThrowError(
      expect.objectContaining({ code: 'product/invalid-args' })
    );
    expect(normalizeVisualUiElements(VISUAL_UI_ELEMENTS.slice(0, VISUAL_UI_ELEMENTS_MAX_COUNT))).toHaveLength(
      VISUAL_UI_ELEMENTS_MAX_COUNT
    );
  });
});
