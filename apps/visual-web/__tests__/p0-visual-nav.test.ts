import { describe, expect, it } from 'vitest';
import { isTabActive } from '../app/visualNav';
import { buildCategoryHref } from '../features/discover/VisualHomeHero';

describe('P0 visual nav', () => {
  it('홈 탭은 루트에서만 활성화된다', () => {
    expect(isTabActive('/', '/')).toBe(true);
    expect(isTabActive('/?screenType=CHECKOUT', '/')).toBe(false);
    expect(isTabActive('/flows', '/')).toBe(false);
  });

  it('플로우 탭은 하위 상세에서도 활성화된다', () => {
    expect(isTabActive('/flows', '/flows')).toBe(true);
    expect(isTabActive('/flows/abc', '/flows')).toBe(true);
    expect(isTabActive('/', '/flows')).toBe(false);
  });

  it('pathname이 없으면 비활성화된다', () => {
    expect(isTabActive(null, '/')).toBe(false);
  });
});

describe('P0 category deeplinks', () => {
  it('카테고리 카드가 필터 URL로 연결된다', () => {
    expect(buildCategoryHref('CHECKOUT')).toBe('/?screenType=CHECKOUT');
    expect(buildCategoryHref('ONBOARDING')).toBe('/?screenType=ONBOARDING');
  });
});
