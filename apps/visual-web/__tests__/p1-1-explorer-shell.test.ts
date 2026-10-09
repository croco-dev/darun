import { describe, expect, it } from 'vitest';
import { buildExplorerUrl, mergeCardsForTest } from '../features/explorer/useExplorerQuery';
import type { ExplorerFilters } from '../features/explorer/useExplorerQuery';

const BASE_FILTERS: ExplorerFilters = { query: null, platform: null, secondary: null, product: null };

describe('P1-1 explorer URL builder', () => {
  it('화면 탐색 URL을 만든다', () => {
    expect(buildExplorerUrl('/', BASE_FILTERS, 'screenType', {})).toBe('/');
    expect(buildExplorerUrl('/', BASE_FILTERS, 'screenType', { q: 'toss' })).toBe('/?q=toss');
    expect(buildExplorerUrl('/', { ...BASE_FILTERS, query: 'toss' }, 'screenType', { secondary: 'CHECKOUT' })).toBe(
      '/?q=toss&screenType=CHECKOUT'
    );
  });

  it('플로 탐색 URL을 만든다', () => {
    expect(buildExplorerUrl('/flows', BASE_FILTERS, 'flowType', { platform: 'IOS' })).toBe('/flows?platform=IOS');
    expect(
      buildExplorerUrl('/flows', { ...BASE_FILTERS, platform: 'IOS' }, 'flowType', { secondary: 'CHECKOUT' })
    ).toBe('/flows?platform=IOS&flowType=CHECKOUT');
  });

  it('상품 필터가 유지된다', () => {
    expect(buildExplorerUrl('/flows', { ...BASE_FILTERS, product: 'toss' }, 'flowType', {})).toBe(
      '/flows?product=toss'
    );
  });
});

describe('P1-1 explorer edge merge', () => {
  it('중복 id를 제거하고 병합한다', () => {
    const merged = mergeCardsForTest([{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'c' }], card => card.id);
    expect(merged.map(card => card.id)).toEqual(['a', 'b', 'c']);
  });
});
