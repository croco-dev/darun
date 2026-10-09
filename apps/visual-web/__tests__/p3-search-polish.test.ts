import { describe, expect, it } from 'vitest';
import {
  isOverlongExplorerQuery,
  readExplorerQueryParam,
  VISUAL_QUERY_MAX_LENGTH,
} from '../features/explorer/useExplorerQuery';

describe('P3 explorer search polish', () => {
  it('검색어 길이 상한이 100자이다', () => {
    expect(VISUAL_QUERY_MAX_LENGTH).toBe(100);
  });

  it('무효 필터(빈 문자열)는 null로 무시된다', () => {
    expect(readExplorerQueryParam(new URLSearchParams('q='))).toBeNull();
    expect(readExplorerQueryParam(new URLSearchParams('q=%20%20'))).toBeNull();
  });

  it('100자 초과 검색어는 길이 오류로 판단된다', () => {
    expect(isOverlongExplorerQuery('a'.repeat(101))).toBe(true);
    expect(isOverlongExplorerQuery('a'.repeat(100))).toBe(false);
    expect(isOverlongExplorerQuery(null)).toBe(false);
  });

  it('정상 검색어는 trim된다', () => {
    expect(readExplorerQueryParam(new URLSearchParams('q=%20toss%20'))).toBe('toss');
  });
});
