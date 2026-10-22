import { describe, expect, it, vi } from 'vitest';
import { isTabActive } from '../app/visualNav';
import { isSavesTabValue, readSavesTabParam } from '../features/saves/useSavesPage';

vi.mock('@apollo/client/react', () => ({
  useApolloClient: () => ({ query: vi.fn(), mutate: vi.fn() }),
}));

vi.mock('@darun/utils-router', () => ({
  useNavigate: () => vi.fn(),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@darun/provider-auth/client', () => ({
  useAuthService: () => ({
    setRedirectUrl: vi.fn(),
    signInWithGoogle: vi.fn(),
  }),
  useAuthState: () => ({ isLoading: false }),
}));

describe('M4 saves page', () => {
  it('저장 탭은 저장 경로에서 활성화된다', () => {
    expect(isTabActive('/saves', '/saves')).toBe(true);
    expect(isTabActive('/', '/saves')).toBe(false);
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
});
