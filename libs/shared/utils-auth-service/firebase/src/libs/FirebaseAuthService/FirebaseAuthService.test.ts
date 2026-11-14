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
function setup(waitForSignOutConfirmation = false) {
  const service = new FirebaseAuthService({
    projectId: 'auth-test',
    apiKey: 'test',
    authDomain: 'localhost',
    clientEmail: '',
    privateKey: '',
    waitForSignOutConfirmation,
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
  sdk.signInWithPopup.mockReset();
  sdk.setCustomParameters.mockClear();
});

it('returns the successful popup account ID even when the current account differs', async () => {
  const { service } = setup();
  const result = deferred<ReturnType<typeof token>>();
  sdk.auth.currentUser = user('other-account', result);
  sdk.signInWithPopup.mockResolvedValue({ user: { uid: 'popup-account' } });

  await expect(service.signInWithGoogle()).resolves.toBe('popup-account');
});

it('requests an account chooser only when the caller opts in', async () => {
  const { service } = setup();
  sdk.signInWithPopup.mockResolvedValue({ user: { uid: 'popup-account' } });
  await service.signInWithGoogle();
  expect(sdk.setCustomParameters).not.toHaveBeenCalled();
  await service.signInWithGoogle({ selectAccount: true });
  expect(sdk.setCustomParameters).toHaveBeenCalledExactlyOnceWith({ prompt: 'select_account' });
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
    sdk.auth.currentUser = null;
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

  it('keeps the current account and does not clear its credentials while sign-out can still be rejected', async () => {
    const { service, values, storage } = setup(true);
    const read = deferred<ReturnType<typeof token>>();
    const current = user('a', read);
    read.resolve(token('account-a'));
    await emit(current);
    const rejected = deferred<void>();
    sdk.auth.signOut.mockReturnValueOnce(rejected.promise);
    const attempt = service.signOut();
    const tokenDuringSignOut = values.get('idToken');
    const clearedDuringSignOut = vi.mocked(storage.clear).mock.calls.length;
    rejected.reject(new Error('storage denied'));
    await expect(attempt).rejects.toThrow('storage denied');
    expect(tokenDuringSignOut).toBe('account-a');
    expect(clearedDuringSignOut).toBe(0);
    const nextSubscriber = vi.fn();
    service.onIdTokenChanged(nextSubscriber);
    expect(nextSubscriber).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
    expect(values.get('refreshToken')).toBe('refresh-a');

    sdk.auth.signOut.mockImplementationOnce(async () => {
      await emit(null);
    });
    await service.signOut();
    expect(nextSubscriber).toHaveBeenLastCalledWith(undefined);
    expect(storage.clear).toHaveBeenCalledTimes(1);
    expect(values.size).toBe(0);
  });

  it('does not restore credentials if Firebase cleared the current user before rejecting sign-out', async () => {
    const { service, values, handler } = setup(true);
    const read = deferred<ReturnType<typeof token>>();
    read.resolve(token('account-a'));
    await emit(user('a', read));
    sdk.auth.signOut.mockImplementationOnce(async () => {
      sdk.auth.currentUser = null;
      throw new Error('persistence failed after clearing currentUser');
    });

    await expect(service.signOut()).rejects.toThrow('persistence failed');
    expect(handler).toHaveBeenLastCalledWith(undefined);
    expect(values.has('idToken')).toBe(false);
    expect(values.has('refreshToken')).toBe(false);
  });

  it('does not synthesize a signed-out event on rejection for apps using the default sign-out behavior', async () => {
    const { service, handler } = setup();
    const read = deferred<ReturnType<typeof token>>();
    read.resolve(token('account-a'));
    await emit(user('a', read));
    sdk.auth.signOut.mockImplementationOnce(async () => {
      sdk.auth.currentUser = null;
      throw new Error('persistence failed');
    });
    await expect(service.signOut()).rejects.toThrow('persistence failed');
    expect(handler).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'a' }));
  });

  it('reads a same-account token refresh deferred during a rejected sign-out', async () => {
    const { service, values } = setup(true);
    const read = deferred<ReturnType<typeof token>>();
    const current = user('a', read);
    read.resolve(token('old'));
    await emit(current);
    const failed = deferred<void>();
    sdk.auth.signOut.mockReturnValueOnce(failed.promise);
    const signOut = service.signOut();
    vi.mocked(current.getIdTokenResult).mockResolvedValue(token('refreshed'));
    await emit(current);
    const tokenDuringSignOut = values.get('idToken');
    failed.reject(new Error('sign-out failed'));
    await expect(signOut).rejects.toThrow('sign-out failed');
    expect(tokenDuringSignOut).toBe('old');
    expect(values.get('idToken')).toBe('refreshed');
  });
});

describe('초기 토큰 조회 오류와 복구', () => {
  it('현재 토큰 조회 실패를 전달하고 토큰과 복귀 URL을 구분해 보존한다', async () => {
    const { service, values, handler } = setup();
    const onError = vi.fn();
    service.onIdTokenChanged(vi.fn(), onError);
    values.set('idToken', 'stale');
    values.set('refreshToken', 'stale-refresh');
    values.set('redirectUrl', '/saved');
    const result = deferred<ReturnType<typeof token>>();
    const pending = emit(user('a', result));
    result.reject(new Error('token unavailable'));
    await expect(pending).resolves.toBeDefined();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(handler).not.toHaveBeenCalled();
    expect(values.get('idToken')).toBeUndefined();
    expect(values.get('refreshToken')).toBeUndefined();
    expect(values.get('redirectUrl')).toBe('/saved');
    const replayError = vi.fn();
    service.onIdTokenChanged(vi.fn(), replayError);
    expect(replayError).toHaveBeenCalledTimes(1);
  });

  it('재시도는 SDK 구독을 늘리지 않고 같은 사용자의 토큰을 다시 조회한다', async () => {
    const { service, values, handler } = setup();
    const result = deferred<ReturnType<typeof token>>();
    const current = user('a', result);
    const pending = emit(current);
    result.reject(new Error('first failed'));
    await expect(pending).resolves.toBeDefined();
    vi.mocked(current.getIdTokenResult).mockResolvedValueOnce(token('recovered'));
    await service.retryAuthState();
    expect(sdk.listeners.size).toBe(1);
    expect(values.get('idToken')).toBe('recovered');
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
  });

  it.each(['signed-out', 'new-account', 'unmounted'])('오래된 조회의 실패도 무시한다: %s', async mode => {
    const { service, handler, unsubscribe, values } = setup();
    const onError = vi.fn();
    const stop = service.onIdTokenChanged(vi.fn(), onError);
    const result = deferred<ReturnType<typeof token>>();
    const old = emit(user('old', result));
    if (mode === 'signed-out') {
      sdk.auth.signOut.mockImplementationOnce(async () => emit(null));
      await service.signOut();
    } else if (mode === 'new-account') {
      const next = deferred<ReturnType<typeof token>>();
      const pending = emit(user('new', next));
      next.resolve(token('new-token'));
      await pending;
    } else {
      unsubscribe();
      stop();
    }
    result.reject(new Error('late failure'));
    await expect(old).resolves.toBeDefined();
    expect(onError).not.toHaveBeenCalled();
    expect(values.get('idToken')).toBe(mode === 'new-account' ? 'new-token' : undefined);
    expect(handler.mock.calls.map(([value]) => value?.id)).toEqual(
      mode === 'new-account' ? ['new'] : mode === 'signed-out' ? [undefined] : []
    );
  });
});
