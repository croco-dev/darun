'use client';

import { AuthService } from '@darun/utils-auth-service-core';
import { useCookies } from 'next-client-cookies';
import { createContext, ReactNode, useContext } from 'react';

export type AuthServiceProviderProps = {
  children: ReactNode;
  authService: AuthService;
};

const AuthServiceContext = createContext<{ authService?: AuthService }>({
  authService: undefined,
});

export const AuthServiceProvider = ({ children, authService }: AuthServiceProviderProps) => {
  const cookies = useCookies();

  authService.setAuthStorage({
    get: key => cookies.get(key) ?? null,
    clear() {
      cookies.remove('idToken');
      cookies.remove('refreshToken');
    },
    set: token => {
      if (token.idToken) {
        cookies.set('idToken', token.idToken);
      }
      if (token.refreshToken) {
        cookies.set('refreshToken', token.refreshToken);
      }
    },
  });
  return <AuthServiceContext.Provider value={{ authService }}>{children}</AuthServiceContext.Provider>;
};

export const useAuthService = () => {
  const { authService } = useContext(AuthServiceContext);

  if (authService === undefined) {
    throw new Error('AuthService was used without providing.');
  }

  return authService;
};
