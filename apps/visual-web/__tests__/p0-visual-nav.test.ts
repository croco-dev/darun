import { describe, expect, it } from 'vitest';
import { getRetainedNavHref } from '../app/VisualLayout';
import { isTabActive } from '../app/visualNav';
import { buildCategoryHref } from '../features/discover/VisualHomeHero';

function retainedParams(href: string): URLSearchParams {
  const query = href.split('?')[1] ?? '';
  return new URLSearchParams(query);
}

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

describe('P0 retained nav query', () => {
  it('탐색 전환 시 호환 파라미터만 유지한다', () => {
    const toFlows = getRetainedNavHref(
      '/flows',
      '/',
      new URLSearchParams('q=Notion&platform=IOS&product=notion&screenType=HOME&step=2')
    );
    expect(toFlows.startsWith('/flows')).toBe(true);
    const flowsParams = retainedParams(toFlows);
    expect(flowsParams.get('q')).toBe('Notion');
    expect(flowsParams.get('platform')).toBe('IOS');
    expect(flowsParams.get('product')).toBe('notion');
    expect(flowsParams.has('screenType')).toBe(false);
    expect(flowsParams.has('step')).toBe(false);
  });

  it('플로우에서 홈으로 돌아갈 때 q만 유지한다', () => {
    const toHome = getRetainedNavHref('/', '/flows', new URLSearchParams('q=Notion&flowType=SIGN_UP'));
    expect(toHome.startsWith('/')).toBe(true);
    const homeParams = retainedParams(toHome);
    expect(homeParams.get('q')).toBe('Notion');
    expect(homeParams.has('flowType')).toBe(false);
  });

  it('앱 상세에서 탐색으로 돌아갈 때 q만 유지한다', () => {
    const toFlows = getRetainedNavHref('/flows', '/apps', new URLSearchParams('q=Notion'));
    expect(retainedParams(toFlows).get('q')).toBe('Notion');

    const toApps = getRetainedNavHref('/apps', '/', new URLSearchParams('q=Notion&platform=IOS'));
    expect(toApps.startsWith('/apps')).toBe(true);
    const appsParams = retainedParams(toApps);
    expect(appsParams.get('q')).toBe('Notion');
    expect(appsParams.has('platform')).toBe(false);
  });

  it('컬렉션 이동 시 탐색 쿼리를 유지하지 않는다', () => {
    expect(getRetainedNavHref('/collections', '/', new URLSearchParams('q=Notion&platform=IOS&product=notion'))).toBe(
      '/collections'
    );
  });
});

describe('P0 category deeplinks', () => {
  it('카테고리 카드가 필터 URL로 연결된다', () => {
    expect(buildCategoryHref('CHECKOUT')).toBe('/?screenType=CHECKOUT');
    expect(buildCategoryHref('ONBOARDING')).toBe('/?screenType=ONBOARDING');
  });
});
