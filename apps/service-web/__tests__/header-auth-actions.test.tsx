// @vitest-environment jsdom
import { NextIntlClientProvider } from 'next-intl';
import React, { act, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { AuthStateProvider } from '../../../libs/shared/provider-auth/client/src/libs/AuthStateProvider/AuthStateProvider';
import { HeaderLoginButton } from '../../../libs/shared/ui-layout/src/libs/HeaderLoginButton/HeaderLoginButton';
import { useHeaderLoginButton } from '../../../libs/shared/ui-layout/src/libs/HeaderLoginButton/useHeaderLoginButton';
import type { AuthService } from '../../../libs/shared/utils-auth-service/core/src/libs/AuthService/AuthService';
import en from '../messages/en.json';
import ko from '../messages/ko.json';

const fixture = vi.hoisted(() => ({
  service: undefined as AuthService | undefined,
  navigate: vi.fn(),
}));
vi.mock('../../../libs/shared/provider-auth/client/src/libs/AuthServiceProvider/AuthServiceProvider', () => ({
  AuthServiceProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuthService: () => fixture.service,
}));
vi.mock('@darun/utils-router', () => ({ useNavigate: () => fixture.navigate }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const disposers: (() => void)[] = [];
afterEach(() => {
  disposers.splice(0).forEach(dispose => dispose());
  vi.restoreAllMocks();
});

function deferred() {
  return Promise.withResolvers<void>();
}

async function mount(locale: 'ko' | 'en' = 'ko') {
  let onChange!: Parameters<AuthService['onIdTokenChanged']>[0];
  let onError: (() => void) | undefined;
  const service = {
    setAuthStorage: vi.fn(),
    onIdTokenChanged: vi.fn((change, error) => {
      onChange = change;
      onError = error;
      return vi.fn();
    }),
    retryAuthState: vi.fn(async () => onChange(undefined)),
    signInWithGoogle: vi.fn(async (): Promise<void> => undefined),
    signOut: vi.fn(async (): Promise<void> => undefined),
    getUser: vi.fn(async () => null),
    setRedirectUrl: vi.fn(),
    getRedirectUrl: vi.fn(),
    clearRedirectUrl: vi.fn(),
  } satisfies AuthService;
  fixture.service = service;
  let actions!: ReturnType<typeof useHeaderLoginButton>;
  function Probe() {
    actions = useHeaderLoginButton();
    return null;
  }
  const element = document.createElement('div');
  document.body.appendChild(element);
  const root = createRoot(element);
  const render = async () => {
    await act(async () => {
      root.render(
        <StrictMode>
          <NextIntlClientProvider locale={locale} messages={locale === 'ko' ? ko : en}>
            <AuthStateProvider>
              <HeaderLoginButton />
              <Probe />
            </AuthStateProvider>
          </NextIntlClientProvider>
        </StrictMode>
      );
    });
  };
  await render();
  let unmounted = false;
  const unmount = () => {
    if (!unmounted) act(() => root.unmount());
    unmounted = true;
    element.remove();
  };
  disposers.push(unmount);
  return {
    service,
    element,
    render,
    unmount,
    actions: () => actions,
    button: () => element.querySelector('button')!,
    alert: () => element.querySelector('[role="alert"]'),
    emit: (loggedIn: boolean) =>
      act(() => onChange(loggedIn ? { id: 'member', email: 'member@example.invalid', isAdmin: false } : undefined)),
    failInitialization: () => act(() => onError?.()),
    click: () => act(async () => element.querySelector('button')!.click()),
  };
}

it.each(['ko', 'en'] as const)(
  '%s에서 초기 확인과 로그인·로그아웃 대기를 구분하고 중복 호출을 막는다',
  async locale => {
    const view = await mount(locale);
    expect(view.element.querySelector('button')).toBeNull();
    view.emit(false);
    const login = deferred();
    view.service.signInWithGoogle.mockReturnValueOnce(login.promise);
    await view.click();
    expect(view.button().disabled).toBe(true);
    expect(view.button().getAttribute('aria-busy')).toBe('true');
    expect(view.button().textContent).toBe(locale === 'ko' ? '로그인 중…' : 'Signing in…');
    await view.click();
    expect(view.service.signInWithGoogle).toHaveBeenCalledTimes(1);
    await act(async () => login.resolve());
    // A fulfilled action alone must not invent an authenticated provider state.
    expect(view.button().textContent).toBe(locale === 'ko' ? '로그인' : 'Login');
    view.emit(true);
    const logout = deferred();
    view.service.signOut.mockReturnValueOnce(logout.promise);
    await view.click();
    expect(view.button().disabled).toBe(true);
    expect(view.button().textContent).toBe(locale === 'ko' ? '로그아웃 중…' : 'Signing out…');
    await view.click();
    expect(view.service.signOut).toHaveBeenCalledTimes(1);
    await act(async () => logout.resolve());
    view.emit(false);
    expect(view.button().disabled).toBe(false);
    expect(view.alert()).toBeNull();
  }
);

it.each(['ko', 'en'] as const)('%s에서 로그인과 로그아웃의 실패를 알리고 같은 버튼으로 재시도한다', async locale => {
  const view = await mount(locale);
  view.emit(false);
  view.service.signInWithGoogle.mockRejectedValueOnce({
    code: locale === 'ko' ? 'auth/popup-blocked' : 'auth/network-request-failed',
    message: 'raw provider data',
  });
  await view.click();
  expect(view.alert()?.textContent).toBe(
    locale === 'ko' ? '로그인하지 못했어요. 다시 시도해 주세요.' : 'Could not sign in. Please try again.'
  );
  expect(view.element.textContent).not.toContain('raw provider data');
  expect(view.button().disabled).toBe(false);
  await view.click();
  expect(view.alert()).toBeNull();
  view.emit(true);
  view.service.signOut.mockRejectedValueOnce(new Error('network failure'));
  await view.click();
  expect(view.alert()?.textContent).toBe(
    locale === 'ko' ? '로그아웃하지 못했어요. 다시 시도해 주세요.' : 'Could not sign out. Please try again.'
  );
  expect(view.button().disabled).toBe(false);
  await view.click();
  view.emit(false);
  expect(view.alert()).toBeNull();
  expect(view.service.signOut).toHaveBeenCalledTimes(2);
});

it.each(['auth/popup-closed-by-user', 'auth/cancelled-popup-request'])(
  '정상 취소 %s 뒤 조용히 다시 시도한다',
  async code => {
    const view = await mount();
    view.emit(false);
    view.service.signInWithGoogle.mockRejectedValueOnce({ code });
    await view.click();
    expect(view.alert()).toBeNull();
    expect(view.button().disabled).toBe(false);
    await view.click();
    expect(view.service.signInWithGoogle).toHaveBeenCalledTimes(2);
  }
);

it('같은 렌더의 action을 연속 실행해도 공급자를 한 번만 호출한다', async () => {
  const view = await mount();
  view.emit(false);
  const pending = deferred();
  view.service.signInWithGoogle.mockReturnValueOnce(pending.promise);
  const login = view.actions().login;
  let first!: Promise<void>;
  await act(async () => {
    first = login();
    await login();
  });
  expect(view.service.signInWithGoogle).toHaveBeenCalledTimes(1);
  await act(async () => {
    pending.resolve();
    await first;
  });
});

it('provider 상태 전환 전 action의 늦은 실패가 현재 action의 대기와 안내를 바꾸지 않는다', async () => {
  const view = await mount();
  view.emit(false);
  const old = deferred();
  view.service.signInWithGoogle.mockReturnValueOnce(old.promise);
  await view.click();
  view.emit(true);
  const current = deferred();
  view.service.signOut.mockReturnValueOnce(current.promise);
  await view.click();
  await act(async () => old.reject(new Error('late login error')));
  expect(view.alert()).toBeNull();
  expect(view.button().disabled).toBe(true);
  expect(view.button().textContent).toBe('로그아웃 중…');
  await act(async () => current.reject(new Error('current logout error')));
  expect(view.alert()?.textContent).toBe('로그아웃하지 못했어요. 다시 시도해 주세요.');
});

it('unmount 이후 실패를 소비하고 재진입한 버튼에 남기지 않는다', async () => {
  const view = await mount();
  view.emit(false);
  const pending = deferred();
  view.service.signInWithGoogle.mockReturnValueOnce(pending.promise);
  await view.click();
  view.unmount();
  await act(async () => pending.reject(new Error('late network error')));
  const next = await mount();
  next.emit(false);
  expect(next.alert()).toBeNull();
  expect(next.button().disabled).toBe(false);
});

it('최초 인증 조회 실패의 다시 확인은 로그인 대신 provider 재조회를 실행한다', async () => {
  const view = await mount();
  view.failInitialization();
  expect(view.alert()?.textContent).toBe('로그인 상태를 확인하지 못했어요.');
  await view.click();
  expect(view.service.retryAuthState).toHaveBeenCalledTimes(1);
  expect(view.service.signInWithGoogle).not.toHaveBeenCalled();
  expect(view.button().textContent).toBe('로그인');
});
