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
      cookies.remove('redirectUrl');
    },
    set: storage => {
      const keys = Object.keys(storage) as (keyof typeof storage)[];

      for (const key of keys) {
        const value = storage[key];
        if (value) {
          cookies.set(key, value);
        } else {
          cookies.remove(key);
        }
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
