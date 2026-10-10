import { describe, expect, it } from 'vitest';
import { VISUAL_NAV_TABS, isTabActive } from '../app/visualNav';

describe('P1-2 app tab', () => {
  it('앱 탭이 내비에 포함된다', () => {
    expect(VISUAL_NAV_TABS.map(tab => tab.href)).toEqual(['/', '/flows', '/apps', '/saves']);
  });

  it('앱 탭은 상세에서도 활성화된다', () => {
    expect(isTabActive('/apps', '/apps')).toBe(true);
    expect(isTabActive('/apps/toss', '/apps')).toBe(true);
    expect(isTabActive('/', '/apps')).toBe(false);
  });
});

describe('P1-2 app collection deeplinks', () => {
  it('앱 상세 모음 전체보기가 product 필터로 연결된다', () => {
    const slug = 'toss';
    expect(`/?product=${encodeURIComponent(slug)}`).toBe('/?product=toss');
    expect(`/flows?product=${encodeURIComponent(slug)}`).toBe('/flows?product=toss');
  });
});
