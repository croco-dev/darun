'use client';

import { useAuthService, useAuthState } from '@darun/provider-auth/client';
import { Button } from '@darun/ui';
import { useNavigate } from '@darun/utils-router';
import { useCallback, useSyncExternalStore } from 'react';

type AuthService = ReturnType<typeof useAuthService>;
type LoginState = 'idle' | 'pending' | 'cancelled' | 'blocked' | 'failed';

const feedback: Record<Exclude<LoginState, 'idle' | 'pending'>, string> = {
  cancelled: 'Google 로그인이 취소됐어요. 다시 시도할 수 있어요.',
  blocked: '로그인 팝업이 차단됐어요. 이 사이트의 팝업을 허용한 뒤 다시 시도해 주세요.',
  failed: 'Google 로그인에 실패했어요. 다시 시도해 주세요.',
};

// A popup can outlive its button while the user navigates within Visual.
const loginStates = new WeakMap<AuthService, LoginState>();
const loginListeners = new WeakMap<AuthService, Set<() => void>>();

function setLoginState(authService: AuthService, state: LoginState) {
  const listeners = loginListeners.get(authService);
  if (state === 'pending' || listeners?.size) loginStates.set(authService, state);
  else loginStates.delete(authService);
  listeners?.forEach(listener => listener());
}

function waitForSignedInUser(authService: AuthService, userId: string) {
  let subscribing = true;
  let unsubscribe: (() => void) | undefined;
  return new Promise<boolean>(resolve => {
    unsubscribe = authService.onIdTokenChanged(user => {
      // The subscription can replay the signed-out state while the new token is being read.
      if (subscribing && !user) return;
      resolve(user?.id === userId);
    });
    // On a token read error, AuthStateProvider offers retry. Keep this attempt's
    // destination until the provider publishes the recovered account or sign-out.
    subscribing = false;
  }).finally(() => unsubscribe?.());
}

export function VisualLoginButton({ redirectTo = '/saves' }: { redirectTo?: string }) {
  const authService = useAuthService();
  const navigate = useNavigate();
  const { isError, isLoading, retry } = useAuthState();
  const subscribe = useCallback(
    (listener: () => void) => {
      const listeners = loginListeners.get(authService) ?? new Set<() => void>();
      loginListeners.set(authService, listeners);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (!listeners.size && loginStates.get(authService) !== 'pending') loginStates.delete(authService);
      };
    },
    [authService]
  );
  const loginState = useSyncExternalStore<LoginState>(
    subscribe,
    () => loginStates.get(authService) ?? 'idle',
    () => 'idle'
  );
  const isPending = loginState === 'pending';

  const login = async () => {
    if (isLoading || isError || loginStates.get(authService) === 'pending') return;
    setLoginState(authService, 'pending');

    let result: LoginState = 'idle';
    try {
      const userId = await authService.signInWithGoogle();
      if (await waitForSignedInUser(authService, userId)) {
        navigate(redirectTo);
      }
    } catch (error: unknown) {
      const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        result = 'cancelled';
      } else {
        result = code === 'auth/popup-blocked' ? 'blocked' : 'failed';
      }
    } finally {
      setLoginState(authService, result);
    }
  };

  if (isError) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p role="alert" className="text-sm text-dark-600">
          로그인 상태를 확인하지 못했어요.
        </p>
        <Button type="button" variant="contained" color="primary" size="md" onClick={retry}>
          다시 확인
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col [align-items:inherit] gap-2">
      <Button
        type="button"
        variant="contained"
        color="primary"
        size="md"
        disabled={isLoading || isPending}
        aria-busy={isPending}
        onClick={login}
      >
        {isPending ? 'Google 로그인 중…' : 'Google로 로그인'}
      </Button>
      {loginState !== 'idle' && loginState !== 'pending' && (
        <p
          role={loginState === 'cancelled' ? 'status' : 'alert'}
          className="max-w-[min(20rem,calc(100vw-2rem))] text-sm text-dark-600"
        >
          {feedback[loginState]}
        </p>
      )}
    </div>
  );
}
