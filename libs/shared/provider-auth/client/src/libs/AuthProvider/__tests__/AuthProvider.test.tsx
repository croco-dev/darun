import { ApolloClient, ApolloLink, gql, InMemoryCache, Observable } from '@apollo/client';
import { FirebaseAuthService } from '@darun/utils-auth-service-firebase';
import { act, cleanup, render, screen } from '@testing-library/react';
import type { User } from 'firebase/auth';
import type { Cookies } from 'next-client-cookies';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApolloProvider } from '../../../../../../utils-apollo-client/client/src/libs/ApolloProvider';
import { sdk } from '../../../../../../utils-auth-service/firebase/src/__tests__/firebaseSdk.fixture';
import { useAuthState } from '../../AuthStateProvider';
import { AuthProvider } from '../AuthProvider';

const navigation = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('@darun/utils-router', () => ({ useNavigate: () => navigation.navigate }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => {
    resolve = yes;
  });
  return { promise, resolve };
}
function authEvent(id: string) {
  const result = deferred<{ token: string; claims: { roles: string[] } }>();
  const user = {
    uid: id,
    email: `${id}@example.invalid`,
    refreshToken: `refresh-${id}`,
    getIdTokenResult: () => result.promise,
  } as unknown as User;
  return {
    user,
    resolve: () => result.resolve({ token: `token-${id}`, claims: { roles: [] } }),
  };
}
function emit(user: User | null) {
  sdk.auth.currentUser = user;
  return Promise.all([...sdk.listeners].map(listener => listener(user)));
}
function Status() {
  const { isLoggedIn, isLoading } = useAuthState();
  return <output aria-label="인증 상태">{isLoading ? 'loading' : isLoggedIn ? 'signed-in' : 'signed-out'}</output>;
}
function setup() {
  const values = new Map<string, string>();
  const cookies: Cookies = {
    get: ((key?: string) => (key ? values.get(key) : Object.fromEntries(values))) as Cookies['get'],
    set: (key, value) => {
      values.set(key, value);
    },
    remove: key => {
      values.delete(key);
    },
  };
  const service = new FirebaseAuthService({
    projectId: 'auth-test',
    apiKey: 'test',
    authDomain: 'localhost',
    clientEmail: '',
    privateKey: '',
  });
  const headers: Record<string, string>[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          headers.push(operation.getContext().headers);
          observer.next({ data: { probe: true } });
          observer.complete();
        })
    ),
  });
  const view = render(
    <ApolloProvider makeClient={() => client} cookies={cookies}>
      <AuthProvider authService={service} cookies={cookies}>
        <Status />
      </AuthProvider>
    </ApolloProvider>
  );
  async function request() {
    await client.query({
      query: gql`
        query AuthProbe {
          probe
        }
      `,
      fetchPolicy: 'no-cache',
    });
    return headers[headers.length - 1]?.['Authorization'];
  }
  return { service, values, view, request };
}

beforeEach(() => {
  sdk.listeners.clear();
  sdk.auth.currentUser = null;
  sdk.auth.signOut.mockReset().mockResolvedValue(undefined);
  navigation.navigate.mockReset();
});
afterEach(cleanup);

describe('실제 인증 adapter와 provider·쿠키·Apollo 연결', () => {
  it('로그아웃 뒤 늦은 인증 결과가 상태·복귀 이동·요청 헤더를 복원하지 않는다', async () => {
    const { service, values, request } = setup();
    values.set('redirectUrl', '/return-after-login');
    const old = authEvent('a');
    const pending = emit(old.user);
    await act(async () => {
      await service.signOut();
      await emit(null);
    });
    await act(async () => {
      old.resolve();
      await pending;
    });
    expect(screen.getByLabelText('인증 상태').textContent).toBe('signed-out');
    expect(values.get('idToken')).toBeUndefined();
    expect(values.get('refreshToken')).toBeUndefined();
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(await request()).toBeUndefined();
  });

  it('계정 B의 상태·쿠키·요청 토큰과 복귀 URL을 이전 A 결과가 되돌리지 않는다', async () => {
    const { values, request } = setup();
    values.set('redirectUrl', '/saved?from=login');
    const a = authEvent('a');
    const b = authEvent('b');
    const old = emit(a.user);
    const latest = emit(b.user);
    await act(async () => {
      b.resolve();
      await latest;
    });
    await act(async () => {
      a.resolve();
      await old;
    });
    expect(screen.getByLabelText('인증 상태').textContent).toBe('signed-in');
    expect(values.get('idToken')).toBe('token-b');
    expect(values.get('refreshToken')).toBe('refresh-b');
    expect(await request()).toBe('Bearer token-b');
    expect(navigation.navigate.mock.calls).toEqual([['/saved?from=login']]);
    expect(values.get('redirectUrl')).toBeUndefined();
  });

  it('초기 로그인·토큰 갱신·로그아웃과 provider 재진입을 유지한다', async () => {
    const { service, values, request, view } = setup();
    const first = authEvent('first');
    const initial = emit(first.user);
    await act(async () => {
      first.resolve();
      await initial;
    });
    expect(await request()).toBe('Bearer token-first');
    const refresh = authEvent('refreshed');
    const refreshed = emit(refresh.user);
    await act(async () => {
      refresh.resolve();
      await refreshed;
    });
    expect(await request()).toBe('Bearer token-refreshed');
    await act(async () => {
      await service.signOut();
      await emit(null);
    });
    expect(screen.getByLabelText('인증 상태').textContent).toBe('signed-out');
    expect(await request()).toBeUndefined();
    const late = authEvent('unmounted');
    const pending = emit(late.user);
    view.unmount();
    late.resolve();
    await pending;
    expect(values.get('idToken')).toBeUndefined();
    const next = setup();
    const reentry = authEvent('reentered');
    const entered = emit(reentry.user);
    await act(async () => {
      reentry.resolve();
      await entered;
    });
    expect(await next.request()).toBe('Bearer token-reentered');
  });
});
