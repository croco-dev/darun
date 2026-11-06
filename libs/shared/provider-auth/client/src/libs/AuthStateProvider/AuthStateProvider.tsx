'use client';

import { AuthUser } from '@darun/utils-auth-service-core';
import { useNavigate } from '@darun/utils-router';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthService } from '../AuthServiceProvider';

export type AuthStateProviderProps = {
  children: ReactNode;
};

type AuthState = 'Uninitialized' | 'Pending' | 'Authorized' | 'UnAuthorized' | 'Error';

const AuthStateContext = createContext<{
  isLoggedIn: boolean;
  authState: AuthState;
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
}>({
  isLoggedIn: false,
  authState: 'Uninitialized',
  isLoading: true,
  isError: false,
  retry: () => {},
});

export const AuthStateProvider = ({ children }: AuthStateProviderProps) => {
  const authService = useAuthService();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const retryRef = useRef<() => void>(() => {});
  const retry = useCallback(() => retryRef.current(), []);
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  const authState: AuthState = useMemo(() => {
    if (isError) return 'Error';
    if (authUser) {
      return 'Authorized';
    }
    if (!isLoading && !authUser) {
      return 'UnAuthorized';
    }

    return 'Uninitialized';
  }, [authUser, isLoading, isError]);

  useEffect(() => {
    let active = true;
    let pending = true;
    const onError = () => {
      if (!active) return;
      pending = false;
      setAuthUser(null);
      setIsError(true);
      setIsLoading(false);
    };
    retryRef.current = () => {
      if (!active || pending) return;
      pending = true;
      setIsError(false);
      setIsLoading(true);
      void authService.retryAuthState().catch(onError);
    };
    const unsubscribe = authService.onIdTokenChanged(user => {
      if (!active) return;
      pending = false;
      setIsError(false);
      setAuthUser(prev => {
        if (!prev && !user) return prev;
        if (prev && user && prev.id === user.id && prev.email === user.email && prev.isAdmin === user.isAdmin) {
          return prev;
        }
        return user ?? null;
      });
      setIsLoading(false);

      if (!user) {
        return;
      }

      const redirectUrl = authService.getRedirectUrl();

      if (!redirectUrl) {
        return;
      }

      authService.clearRedirectUrl();
      navigateRef.current(redirectUrl);
    }, onError);

    return () => {
      active = false;
      unsubscribe();
    };
  }, [authService]);

  return (
    <AuthStateContext.Provider
      value={{
        isLoggedIn: authState === 'Authorized',
        authState,
        isLoading,
        isError,
        retry,
      }}
    >
      {children}
    </AuthStateContext.Provider>
  );
};

export const useAuthState = () => {
  return useContext(AuthStateContext);
};
