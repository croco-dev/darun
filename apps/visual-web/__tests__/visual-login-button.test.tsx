// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { AuthProvider } from '@darun/provider-auth/client';
import type { ComponentProps } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientRootProvider } from '../app/client';
import { VisualLoginButton } from '../features/saves/VisualLoginButton';

const navigate = vi.hoisted(() => vi.fn());
vi.mock('@darun/utils-router', () => ({ useNavigate: () => navigate }));
vi.mock('../app/container', () => ({
  container: {
    get authService() {
      return visualAuthService;
    },
    get apolloClient() {
      return visualApolloClient;
    },
  },
}));
vi.mock('next-client-cookies', () => ({ useCookies: () => visualCookies }));
vi.mock('@darun/utils-apollo-client/client', () => ({
  ApolloProvider: ({
    children,
    makeClient,
  }: {
    children: ComponentProps<typeof ApolloProvider>['children'];
    makeClient: () => ApolloClient;
  }) => <ApolloProvider client={makeClient()}>{children}</ApolloProvider>,
}));

type AuthProviderProps = ComponentProps<typeof AuthProvider>;
type AuthService = AuthProviderProps['authService'];
type AuthListener = Parameters<AuthService['onIdTokenChanged']>[0];
let visualAuthService: AuthService;
let visualApolloClient: ApolloClient;
let visualCookies: AuthProviderProps['cookies'];

const user = { id: 'person', email: 'person@example.test', isAdmin: false };
const detailPath = '/screenshots/screen%2FA';

function createAuthFixture() {
  const cookies = new Map<string, string>();
  function getCookie(key: string): string | undefined;
  function getCookie(): Record<string, string>;
  function getCookie(key?: string) {
    return key === undefined ? Object.fromEntries(cookies) : cookies.get(key);
  }
  let storage: Parameters<AuthService['setAuthStorage']>[0];
  const listeners = new Map<AuthListener, (() => void) | undefined>();
  let currentUser: typeof user | undefined;
  const popups: { succeed: () => void; fail: (code: string) => void }[] = [];
  const authService: AuthService = {
    setAuthStorage: value => {
      storage = value;
    },
    onIdTokenChanged: (listener, onError) => {
      listeners.set(listener, onError);
      if (currentUser) listener(currentUser);
      return () => listeners.delete(listener);
    },
    retryAuthState: async () => listeners.forEach((_, listener) => listener(user)),
    signInWithGoogle: () =>
      new Promise<string>((resolve, reject) => {
        popups.push({
          succeed: () => resolve(user.id),
          fail: code => reject(Object.assign(new Error('Popup did not complete'), { code })),
        });
      }),
    getUser: async () => null,
    signOut: async () => {},
    setRedirectUrl: redirectUrl => storage.set({ redirectUrl }),
    getRedirectUrl: () => storage.get('redirectUrl') ?? undefined,
    clearRedirectUrl: () => storage.set({ redirectUrl: undefined }),
  };
  return {
    authService,
    cookies: {
      get: getCookie,
      set: (key, value) => void cookies.set(key, value),
      remove: key => void cookies.delete(key),
    } satisfies AuthProviderProps['cookies'],
    popups,
    failTokenRead: () => act(async () => listeners.forEach(onError => onError?.())),
    emit: (value?: typeof user) =>
      act(async () => {
        currentUser = value;
        listeners.forEach((_, listener) => listener(value));
      }),
  };
}

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe('Visual Google login', () => {
  let host: HTMLDivElement;
  let root: Root;
  let fixture: ReturnType<typeof createAuthFixture>;
  const button = () => host.querySelector('button')!;
  const render = (path?: string, key?: string) =>
    act(async () =>
      root.render(
        <ClientRootProvider>
          <VisualLoginButton key={key} redirectTo={path} />
        </ClientRootProvider>
      )
    );

  beforeEach(() => {
    navigate.mockClear();
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    visualApolloClient = new ApolloClient({
      cache: new InMemoryCache(),
      link: ApolloLink.empty(),
    });
    fixture = createAuthFixture();
    visualAuthService = fixture.authService;
    visualCookies = fixture.cookies;
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    visualApolloClient.stop();
    host.remove();
  });

  it('opens a single popup across rapid clicks and a remount, then allows a fresh attempt', async () => {
    await render(detailPath, 'detail');
    await fixture.emit();
    await act(async () => {
      button().click();
      button().click();
    });
    expect(fixture.popups).toHaveLength(1);
    expect(button().disabled).toBe(true);
    expect(button().getAttribute('aria-busy')).toBe('true');

    await render('/saves', 'saves');
    expect(button().disabled).toBe(true);
    await act(async () => button().click());
    expect(fixture.popups).toHaveLength(1);

    await act(async () => fixture.popups[0].fail('auth/popup-closed-by-user'));
    expect(host.querySelector('[role="status"]')?.textContent).toContain('취소');
    await act(async () => button().click());
    expect(fixture.popups).toHaveLength(2);
    await fixture.emit(user);
    await act(async () => fixture.popups[1].succeed());
    expect(navigate.mock.calls).toEqual([['/saves']]);
  });

  it('discards a legacy popup destination when the initial token arrives', async () => {
    fixture.cookies.set('redirectUrl', '/screenshots/cancelled');
    await render();
    await fixture.emit(user);

    expect(navigate).not.toHaveBeenCalled();
    expect(fixture.cookies.get('redirectUrl')).toBeUndefined();
  });

  it.each([
    ['auth/popup-closed-by-user', '취소'],
    ['auth/cancelled-popup-request', '취소'],
    ['auth/popup-blocked', '팝업'],
    ['auth/network-request-failed', '실패'],
  ])('recovers from %s without navigating on a later token event', async (code, feedback) => {
    await render(detailPath);
    await fixture.emit();
    await act(async () => button().click());
    await fixture.emit(user);
    expect(navigate).not.toHaveBeenCalled();
    await act(async () => fixture.popups[0].fail(code));

    expect(button().disabled).toBe(false);
    await fixture.emit(user);
    expect(navigate).not.toHaveBeenCalled();
    expect(host.querySelector('[role="alert"], [role="status"]')?.textContent ?? '').toContain(feedback);

    await fixture.emit();
    await act(async () => button().click());
    expect(host.querySelector('[role="alert"], [role="status"]')).toBeNull();
    expect(fixture.popups).toHaveLength(2);
    await fixture.emit(user);
    await act(async () => fixture.popups[1].succeed());
    expect(navigate.mock.calls).toEqual([[detailPath]]);
  });

  it.each(['/saves', '/flows/flow%2FB', detailPath])('returns to %s once on login', async path => {
    await render(path);
    await fixture.emit();
    await act(async () => button().click());
    await fixture.emit(user);
    await act(async () => fixture.popups[0].succeed());
    await fixture.emit(user);
    expect(navigate.mock.calls).toEqual([[path]]);
  });
  it('waits for the verified user if the popup finishes first', async () => {
    await render(detailPath);
    await fixture.emit();
    await act(async () => button().click());
    await act(async () => fixture.popups[0].succeed());
    expect(navigate).not.toHaveBeenCalled();
    expect(button().disabled).toBe(true);
    await act(async () => button().click());
    expect(fixture.popups).toHaveLength(1);
    await fixture.emit(user);
    await fixture.emit(user);
    expect(navigate.mock.calls).toEqual([[detailPath]]);
  });

  it('retries a failed token read without reopening the successful popup', async () => {
    await render(detailPath);
    await fixture.emit();
    await act(async () => button().click());
    await act(async () => fixture.popups[0].succeed());
    await fixture.failTokenRead();
    expect(navigate).not.toHaveBeenCalled();
    expect(button().textContent).toBe('다시 확인');
    await act(async () => button().click());
    expect(fixture.popups).toHaveLength(1);
    expect(navigate.mock.calls).toEqual([[detailPath]]);
  });

  it('does not navigate when a different account replaces the popup account', async () => {
    await render(detailPath);
    await fixture.emit();
    await act(async () => button().click());
    await act(async () => fixture.popups[0].succeed());
    await fixture.emit({ ...user, id: 'another-account' });
    await fixture.emit(user);
    expect(navigate).not.toHaveBeenCalled();
  });
});
