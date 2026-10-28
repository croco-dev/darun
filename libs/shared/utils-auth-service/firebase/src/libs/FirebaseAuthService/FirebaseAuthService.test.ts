import type { AuthStorage, AuthUser } from '@darun/utils-auth-service-core';
import type { User } from 'firebase/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sdk } from '../../__tests__/firebaseSdk.fixture';
import { FirebaseAuthService } from './FirebaseAuthService';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function token(token: string) {
  return {
    token,
    claims: { roles: ['admin'] },
    authTime: '',
    expirationTime: '',
    issuedAtTime: '',
    signInProvider: null,
    signInSecondFactor: null,
  };
}
function user(uid: string, result: ReturnType<typeof deferred<ReturnType<typeof token>>>) {
  return {
    uid,
    email: `${uid}@example.invalid`,
    refreshToken: `refresh-${uid}`,
    getIdTokenResult: vi.fn(() => result.promise),
  } as unknown as User;
}
function emit(user: User | null) {
  sdk.auth.currentUser = user;
  return Promise.all([...sdk.listeners].map(listener => listener(user)));
}
function setup() {
  const service = new FirebaseAuthService({
    projectId: 'auth-test',
    apiKey: 'test',
    authDomain: 'localhost',
    clientEmail: '',
    privateKey: '',
  });
  const values = new Map<string, string>();
  const storage: AuthStorage = {
    get: key => values.get(key) ?? null,
    set: vi.fn<AuthStorage['set']>(items => {
      for (const [key, value] of Object.entries(items)) {
        if (value) values.set(key, value);
        else values.delete(key);
      }
    }),
    clear: vi.fn(() => values.clear()),
  };
  service.setAuthStorage(storage);
  const handler = vi.fn<(user?: AuthUser) => void>();
  const unsubscribe = service.onIdTokenChanged(handler);
  return { service, values, storage, handler, unsubscribe };
}

beforeEach(() => {
  sdk.listeners.clear();
  sdk.auth.currentUser = null;
  sdk.auth.signOut.mockReset().mockResolvedValue(undefined);
});

describe('FirebaseAuthService의 인증 결과 순서', () => {
  it.each([false, true])('로그아웃 시작 뒤에는 이전 토큰을 복원하지 않는다 (비로그인 이벤트: %s)', async nullEvent => {
    const { service, values, handler, storage } = setup();
    const result = deferred<ReturnType<typeof token>>();
    const pending = emit(user('old', result));
    const signedOut = deferred<void>();
    sdk.auth.signOut.mockReturnValue(signedOut.promise);
    const logout = service.signOut();
    if (nullEvent) await emit(null);
    result.resolve(token('old-token'));
    await pending;
    expect(values.size).toBe(0);
    expect(handler.mock.calls.filter(([value]) => value)).toEqual([]);
    expect(storage.set).not.toHaveBeenCalledWith(expect.objectContaining({ idToken: 'old-token' }));
    signedOut.resolve();
    await logout;
  });

  it('계정 B가 반영된 뒤 완료한 A의 조회는 두 토큰과 상태를 바꾸지 않는다', async () => {
    const { values, handler } = setup();
    const a = deferred<ReturnType<typeof token>>();
    const b = deferred<ReturnType<typeof token>>();
    const old = emit(user('a', a));
    const latest = emit(user('b', b));
    b.resolve(token('token-b'));
    await latest;
    a.resolve(token('token-a'));
    await old;
    expect(values.get('idToken')).toBe('token-b');
    expect(values.get('refreshToken')).toBe('refresh-b');
    expect(handler.mock.calls.map(([value]) => value?.id)).toEqual(['b']);
  });

  it('같은 계정의 토큰 갱신도 최신 이벤트를 유지한다', async () => {
    const { values, handler } = setup();
    const a = deferred<ReturnType<typeof token>>();
    const b = deferred<ReturnType<typeof token>>();
    const current = user('same', a);
    const old = emit(current);
    vi.mocked(current.getIdTokenResult).mockImplementationOnce(() => b.promise as ReturnType<User['getIdTokenResult']>);
    const latest = emit(current);
    b.resolve(token('new-token'));
    await latest;
    a.resolve(token('old-token'));
    await old;
    expect(values.get('idToken')).toBe('new-token');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('SDK의 비로그인 이벤트는 진행 중 조회와 기존 토큰을 무효화한다', async () => {
    const { values, handler } = setup();
    values.set('idToken', 'existing');
    values.set('refreshToken', 'existing-refresh');
    const result = deferred<ReturnType<typeof token>>();
    const pending = emit(user('a', result));
    await emit(null);
    result.resolve(token('late'));
    await pending;
    expect(values.size).toBe(0);
    expect(handler.mock.calls).toEqual([[undefined]]);
  });

  it('해제된 구독의 결과를 버리고 재구독은 정상 반영한다', async () => {
    const { service, values, handler, unsubscribe } = setup();
    const oldResult = deferred<ReturnType<typeof token>>();
    const old = emit(user('a', oldResult));
    unsubscribe();
    const next = vi.fn();
    const stop = service.onIdTokenChanged(next);
    const newResult = deferred<ReturnType<typeof token>>();
    const latest = emit(user('b', newResult));
    newResult.resolve(token('new'));
    await latest;
    oldResult.resolve(token('late'));
    await old;
    expect(handler).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(values.get('idToken')).toBe('new');
    stop();
  });

  it('한 구독의 해제는 다른 구독의 정상 토큰 반영을 막지 않는다', async () => {
    const { service, values, handler, unsubscribe } = setup();
    const remaining = vi.fn();
    const stop = service.onIdTokenChanged(remaining);
    const result = deferred<ReturnType<typeof token>>();
    const pending = emit(user('a', result));
    unsubscribe();
    result.resolve(token('active'));
    await pending;
    expect(handler).not.toHaveBeenCalled();
    expect(remaining).toHaveBeenCalledTimes(1);
    expect(values.get('idToken')).toBe('active');
    stop();
  });

  it('정상 로그인에서 handler가 읽는 토큰도 새 결과이며 추가 구독에 현재 상태를 전달한다', async () => {
    const { service, values, handler } = setup();
    handler.mockImplementation(() => expect(values.get('idToken')).toBe('current'));
    const result = deferred<ReturnType<typeof token>>();
    const pending = emit(user('a', result));
    result.resolve(token('current'));
    await pending;
    expect(handler).toHaveBeenCalledWith({
      id: 'a',
      email: 'a@example.invalid',
      isAdmin: true,
    });
    const added = vi.fn();
    service.onIdTokenChanged(added);
    expect(added).toHaveBeenCalledWith({
      id: 'a',
      email: 'a@example.invalid',
      isAdmin: true,
    });
  });

  it('로그아웃 실패를 전달하고 이후 정상 인증 이벤트를 허용한다', async () => {
    const { service, values } = setup();
    sdk.auth.signOut.mockRejectedValueOnce(new Error('sign-out failed'));
    await expect(service.signOut()).rejects.toThrow('sign-out failed');
    const result = deferred<ReturnType<typeof token>>();
    const pending = emit(user('b', result));
    result.resolve(token('recovered'));
    await pending;
    expect(values.get('idToken')).toBe('recovered');
  });
});
