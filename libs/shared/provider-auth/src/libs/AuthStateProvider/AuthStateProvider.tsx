'use client';

import { AuthUser } from '@darun/utils-auth-service-core';
import { createContext, ReactNode, useEffect, useMemo, useState } from 'react';
import { useAuthService } from '../AuthServiceProvider';

export type AuthStateProviderProps = {
  children: ReactNode;
};

type AuthState = 'Uninitialized' | 'Pending' | 'Authorized' | 'UnAuthorized';

const AuthStateContext = createContext<{
  isLoggedIn: boolean;
  authState: AuthState;
  isInitialized: boolean;
}>({
  isLoggedIn: false,
  authState: 'Uninitialized',
  isInitialized: false,
});

export const AuthStateProvider = ({ children }: AuthStateProviderProps) => {
  const authService = useAuthService();
  const [authUser, setAuthUser] = useState<AuthUser | null>();
  const [isInitialized, setIsInitialized] = useState(false);

  const authState: AuthState = useMemo(() => {
    if (authUser) {
      return 'Authorized';
    }
    if (isInitialized && !authUser) {
      return 'UnAuthorized';
    }

    return 'Uninitialized';
  }, []);

  useEffect(() => {
    const unsubscribe = authService.onIdTokenChanged(user => {
      setAuthUser(user ? user : null);
      setIsInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthStateContext.Provider
      value={{
        isLoggedIn: authState === 'Authorized',
        authState,
        isInitialized,
      }}
    >
      {children}
    </AuthStateContext.Provider>
  );
};
