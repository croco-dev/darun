import { useAuthService, useAuthState } from '@darun/provider-auth/client';
import { useEffect, useRef, useState } from 'react';

type AuthAction = 'login' | 'logout';

export function useHeaderLoginButton() {
  const authService = useAuthService();
  const { isLoggedIn, isLoading, isError, retry } = useAuthState();
  const [pendingAction, setPendingAction] = useState<AuthAction | null>(null);
  const [actionError, setActionError] = useState<AuthAction | null>(null);
  const [previousAuthState, setPreviousAuthState] = useState({ authService, isLoggedIn, isLoading, isError });
  const contextRef = useRef<{ pending: boolean } | null>(null);

  if (
    previousAuthState.authService !== authService ||
    previousAuthState.isLoggedIn !== isLoggedIn ||
    previousAuthState.isLoading !== isLoading ||
    previousAuthState.isError !== isError
  ) {
    setPreviousAuthState({ authService, isLoggedIn, isLoading, isError });
    setPendingAction(null);
    setActionError(null);
  }

  useEffect(() => {
    const context = { pending: false };
    contextRef.current = context;
    return () => {
      contextRef.current = null;
    };
  }, [authService, isLoggedIn, isLoading, isError]);

  const runAction = async (action: AuthAction) => {
    const context = contextRef.current;
    if (!context || context.pending || isLoading || isError) return;
    context.pending = true;
    setPendingAction(action);
    setActionError(null);
    try {
      if (action === 'login') await authService.signInWithGoogle();
      else await authService.signOut();
    } catch (error: unknown) {
      if (contextRef.current !== context) return;
      if (
        action === 'login' &&
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request')
      ) {
        return;
      }
      setActionError(action);
    } finally {
      if (contextRef.current === context) {
        context.pending = false;
        setPendingAction(null);
      }
    }
  };

  return {
    isError,
    retry,
    isLoggedIn,
    isLoading,
    pendingAction,
    actionError,
    login: () => runAction('login'),
    logout: () => runAction('logout'),
  };
}
