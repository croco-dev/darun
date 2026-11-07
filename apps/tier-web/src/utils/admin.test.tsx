import { searchAndAddApps, updateAppMemo, updateTier, deleteApp } from '@/app/admin/actions';
import AdminLayout from '@/app/admin/layout';
import { Header } from '@/components/Header';
import { AuthSessionMissingError } from '@supabase/supabase-js';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkIsAdmin, requireAdmin } from './admin';

const fixture = vi.hoisted(() => ({
  getUser: vi.fn(),
  profile: vi.fn(),
  write: vi.fn(),
  upsert: vi.fn(),
  apple: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));
vi.mock('next/navigation', () => ({
  redirect: fixture.redirect,
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/app/admin/app-store-search', () => ({
  parseAppStoreKeyword: (value: unknown) => value,
  fetchAppStoreApps: fixture.apple,
}));
vi.mock('@/components/HeaderNav', () => ({
  HeaderNav: () => <nav>공개 탐색</nav>,
}));
vi.mock('@/components/UserMenu', () => ({
  UserMenu: ({ isAdmin }: { isAdmin: boolean }) => <span>{isAdmin ? '관리자 메뉴' : '일반 메뉴'}</span>,
}));
vi.mock('@/utils/supabase/server', () => {
  const client = {
    auth: { getUser: fixture.getUser },
    from: (table: string) => {
      if (table !== 'users') {
        fixture.write(table);
        return { upsert: fixture.upsert };
      }
      return {
        select: () => ({
          eq: () => ({ single: fixture.profile, maybeSingle: fixture.profile }),
        }),
      };
    },
  };
  return { createClient: () => client, createAdminClient: () => client };
});

beforeEach(() => {
  vi.clearAllMocks();
  fixture.getUser.mockResolvedValue({
    data: { user: { id: 'auth-user', email: 'admin@example.invalid' } },
    error: null,
  });
  fixture.profile.mockResolvedValue({
    data: { id: 'verified-admin', is_admin: true },
    error: null,
  });
  fixture.upsert.mockResolvedValue({ error: null });
});

const providerFailure = { message: 'private SQL/token fixture', status: 503 };

describe('관리자 권한 조회와 장애 복구', () => {
  it('정상 관리자만 허용하고 비관리자와 없는 프로필은 차단한다', async () => {
    expect(await checkIsAdmin()).toBe(true);
    await expect(requireAdmin()).resolves.toBeDefined();
    for (const data of [{ id: 'member', is_admin: false }, null]) {
      fixture.profile.mockResolvedValue({ data, error: null });
      expect(await checkIsAdmin()).toBe(false);
      await expect(requireAdmin()).rejects.toThrow('REDIRECT:/');
    }
  });

  it('세션이 없는 방문자는 권한 조회 없이 차단한다', async () => {
    fixture.getUser.mockResolvedValue({
      data: { user: null },
      error: new AuthSessionMissingError(),
    });
    expect(await checkIsAdmin()).toBe(false);
    await expect(requireAdmin()).rejects.toThrow('REDIRECT:/');
    expect(fixture.profile).not.toHaveBeenCalled();
  });

  it.each(['auth', 'profile', 'throw'] as const)('%s 공급자 장애를 비관리자 redirect로 바꾸지 않는다', async kind => {
    if (kind === 'auth')
      fixture.getUser.mockResolvedValue({
        data: { user: null },
        error: providerFailure,
      });
    else if (kind === 'profile')
      fixture.profile.mockResolvedValue({
        data: null,
        error: providerFailure,
      });
    else fixture.profile.mockRejectedValue(new Error(providerFailure.message));

    await expect(checkIsAdmin()).rejects.toThrow('관리자 권한을 확인하지 못했습니다');
    await expect(requireAdmin()).rejects.toThrow('관리자 권한을 확인하지 못했습니다');
    expect(fixture.redirect).not.toHaveBeenCalled();
    expect(fixture.write).not.toHaveBeenCalled();
  });

  it('관리자 route는 원문 오류와 콘텐츠 대신 재시도를 표시하고 복구 후 같은 콘텐츠를 연다', async () => {
    fixture.profile.mockResolvedValue({ data: null, error: providerFailure });
    const markup = renderToStaticMarkup(await AdminLayout({ children: <p>보호된 관리자 콘텐츠</p> }));
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('다시 시도');
    expect(markup).not.toContain('보호된 관리자 콘텐츠');
    expect(markup).not.toContain(providerFailure.message);
    expect(fixture.redirect).not.toHaveBeenCalled();
    fixture.profile.mockResolvedValue({
      data: { id: 'verified-admin', is_admin: true },
      error: null,
    });
    expect(renderToStaticMarkup(await AdminLayout({ children: <p>보호된 관리자 콘텐츠</p> }))).toContain(
      '보호된 관리자 콘텐츠'
    );
  });

  it('공개 헤더는 보조 조회 실패에도 렌더하고 관리자 메뉴 대신 복구 안내를 표시한다', async () => {
    fixture.profile.mockResolvedValue({ data: null, error: providerFailure });
    const markup = renderToStaticMarkup(await Header());
    expect(markup).toContain('공개 탐색');
    expect(markup).toContain('다시 시도');
    expect(markup).not.toContain('관리자 메뉴');
    expect(markup).not.toContain(providerFailure.message);
  });

  it('모든 쓰기 action은 권한 조회 장애에서 업무 쓰기와 외부 검색을 실행하지 않는다', async () => {
    fixture.profile.mockResolvedValue({ data: null, error: providerFailure });
    await expect(updateTier('app-1', 2)).rejects.toThrow('관리자 권한을 확인하지 못했습니다');
    await expect(updateAppMemo('app-1', '보존할 초안')).rejects.toThrow('관리자 권한을 확인하지 못했습니다');
    await expect(deleteApp('app-1')).rejects.toThrow('관리자 권한을 확인하지 못했습니다');
    const form = new FormData();
    form.set('keyword', '보존할 검색어');
    await expect(searchAndAddApps({ status: 'idle', message: '' }, form)).resolves.toMatchObject({ status: 'error' });
    expect(fixture.apple).not.toHaveBeenCalled();
    expect(fixture.write).not.toHaveBeenCalled();
    expect(fixture.redirect).not.toHaveBeenCalled();
  });

  it('장애 복구 후 같은 티어 변경은 확인된 관리자로 한 번만 저장한다', async () => {
    fixture.profile.mockResolvedValueOnce({
      data: null,
      error: providerFailure,
    });
    await expect(updateTier('app-1', 2)).rejects.toThrow('관리자 권한을 확인하지 못했습니다');
    await updateTier('app-1', 2);
    expect(fixture.upsert).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        app_id: 'app-1',
        assigned_by: 'verified-admin',
        tier: 2,
      }),
      { onConflict: 'app_id' }
    );
  });

  it('관리자 데이터가 함께 와도 조회 오류를 무시해 쓰기를 허용하지 않는다', async () => {
    fixture.profile.mockResolvedValue({
      data: { id: 'verified-admin', is_admin: true },
      error: providerFailure,
    });
    await expect(updateTier('app-1', 2)).rejects.toThrow('관리자 권한을 확인하지 못했습니다');
    expect(fixture.write).not.toHaveBeenCalled();
  });
});
