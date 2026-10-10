import { describe, expect, it } from 'vitest';
import { isTabActive } from '../app/visualNav';

describe('P1-2 app tab', () => {
  it('앱 탭은 상세에서도 활성화된다', () => {
    expect(isTabActive('/apps', '/apps')).toBe(true);
    expect(isTabActive('/apps/toss', '/apps')).toBe(true);
    expect(isTabActive('/', '/apps')).toBe(false);
  });
});
