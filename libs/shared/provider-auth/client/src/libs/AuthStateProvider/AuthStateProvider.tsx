'use client';

import { AuthUser } from '@darun/utils-auth-service-core';
import { useNavigate } from '@darun/utils-router';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useAuthService } from '../AuthServiceProvider';

export type AuthStateProviderProps = {
  children: ReactNode;
};

type AuthState = 'Uninitialized' | 'Pending' | 'Authorized' | 'UnAuthorized';

const AuthStateContext = createContext<{
  isLoggedIn: boolean;
  authState: AuthState;
  isLoading: boolean;
}>({
  isLoggedIn: false,
  authState: 'Uninitialized',
  isLoading: true,
});

export const AuthStateProvider = ({ children }: AuthStateProviderProps) => {
  const authService = useAuthService();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const authState: AuthState = useMemo(() => {
    if (authUser) {
      return 'Authorized';
    }
    if (!isLoading && !authUser) {
      return 'UnAuthorized';
    }

    return 'Uninitialized';
  }, [authUser, isLoading]);

  useEffect(() => {
    const unsubscribe = authService.onIdTokenChanged(user => {
      setAuthUser(user ?? null);
      setIsLoading(false);

      if (!user) {
        return;
      }

      const redirectUrl = authService.getRedirectUrl();

      if (!redirectUrl) {
        return;
      }

      authService.clearRedirectUrl();
      navigate(redirectUrl);
    });

    return () => unsubscribe();
  }, [authService, navigate]);

  return (
    <AuthStateContext.Provider
      value={{
        isLoggedIn: authState === 'Authorized',
        authState,
        isLoading,
      }}
    >
      {children}
    </AuthStateContext.Provider>
  );
};

export const useAuthState = () => {
  return useContext(AuthStateContext);
};
