import type * as Router from '@darun/utils-router';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import SavesPage from '../app/saves/page';
import { VISUAL_NAV_TABS, isTabActive } from '../app/visualNav';
import { VISUAL_SAVES_PAGE_SIZE } from '../features/saves/saveDocuments';
import { isSavesTabValue, readSavesTabParam } from '../features/saves/useSavesPage';

const testDir = dirname(fileURLToPath(import.meta.url));
const appRoot = join(testDir, '..');

vi.mock('@apollo/client/react', () => ({
  useApolloClient: () => ({ query: vi.fn(), mutate: vi.fn() }),
}));

vi.mock('@darun/utils-router', async importOriginal => ({
  ...(await importOriginal<typeof Router>()),
  useNavigate: () => vi.fn(),
  usePathname: () => '/saves',
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@darun/provider-auth/client', () => ({
  useAuthService: () => ({ setRedirectUrl: vi.fn(), signInWithGoogle: vi.fn() }),
  useAuthState: () => ({ isLoading: false }),
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

  it('실제 저장 페이지와 공통 레이아웃은 고유한 본문과 건너뛰기 대상을 렌더한다', () => {
    const out = renderToStaticMarkup(createElement(SavesPage));

    expect(out.match(/<main\b/g)).toHaveLength(1);
    expect(out.match(/\bid="main-content"/g)).toHaveLength(1);
    expect(out).toMatch(/<main id="main-content" tabindex="-1"/);
    expect(out).toMatch(/<a href="#main-content"[^>]*>본문으로 건너뛰기<\/a>/);
    expect(out).toContain('w-full py-8 md:py-12');
    expect(out).toContain('저장한 화면을 불러오는 중');
    expect(out).toMatch(/<a(?=[^>]*href="\/saves")(?=[^>]*aria-current="page")[^>]*>/);
    expect(out).toContain('role="search"');
  });
});

describe('M5 saves finish', () => {
  it('tab 파라미터가 화면·플로우만 허용된다', () => {
    expect(isSavesTabValue('screenshots')).toBe(true);
    expect(isSavesTabValue('flows')).toBe(true);
    expect(isSavesTabValue('apps')).toBe(false);
    expect(isSavesTabValue(null)).toBe(false);
  });

  it('tab 파라미터가 없거나 잘못되면 화면 탭이 기본값이다', () => {
    expect(readSavesTabParam(new URLSearchParams())).toBe('screenshots');
    expect(readSavesTabParam(new URLSearchParams('tab=apps'))).toBe('screenshots');
    expect(readSavesTabParam(new URLSearchParams('tab=flows'))).toBe('flows');
  });

  it('탭별 더보기 로딩·에러 상태가 분리된다 (회귀: 전역 공유 금지)', () => {
    const source = readFileSync(join(appRoot, 'features/saves/useSavesPage.ts'), 'utf-8');

    expect(source).toMatch(/screenshotLoadingMore/);
    expect(source).toMatch(/flowLoadingMore/);
    expect(source).toMatch(/screenshotLoadMoreError/);
    expect(source).toMatch(/flowLoadMoreError/);
    // 전역 단일 loadingMore/loadMoreError 상태가 남아 있으면 안 된다
    expect(source).not.toMatch(/const \[loadingMore, setLoadingMore\]/);
    expect(source).not.toMatch(/const \[loadMoreError, setLoadMoreError\]/);
  });
});
