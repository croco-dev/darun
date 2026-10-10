import { describe, expect, it, vi } from 'vitest';
import { VISUAL_NAV_TABS, isTabActive } from '../app/visualNav';
import { VISUAL_SAVES_PAGE_SIZE } from '../features/saves/saveDocuments';

vi.mock('@apollo/client/react', () => ({
  useApolloClient: () => ({ query: vi.fn(), mutate: vi.fn() }),
}));

describe('M4 saves page', () => {
  it('저장 탭이 내비에 포함된다', () => {
    expect(VISUAL_NAV_TABS.map(tab => tab.href)).toContain('/saves');
  });

  it('저장 탭은 저장 경로에서 활성화된다', () => {
    expect(isTabActive('/saves', '/saves')).toBe(true);
    expect(isTabActive('/', '/saves')).toBe(false);
  });

  it('저장 페이지 크기는 탐색 페이지와 동일하다', () => {
    expect(VISUAL_SAVES_PAGE_SIZE).toBe(24);
  });
});
