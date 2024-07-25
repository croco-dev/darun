'use client';

import { useApolloClient } from '@apollo/client';
import { AuthService } from '@darun/utils-auth-service-core';
import { Cookies } from 'next-client-cookies';
import { createContext, ReactNode, useContext } from 'react';

export type AuthServiceProviderProps = {
  cookies: Cookies;
  children: ReactNode;
  authService: AuthService;
};

const AuthServiceContext = createContext<{ authService?: AuthService }>({
  authService: undefined,
});

export const AuthServiceProvider = ({ cookies, children, authService }: AuthServiceProviderProps) => {
  const client = useApolloClient();

  authService.setAuthStorage({
    get: key => cookies.get(key) ?? null,
    clear() {
      cookies.remove('idToken');
      cookies.remove('refreshToken');
      cookies.remove('redirectUrl');
      client.resetStore();
    },
    set: storage => {
      const keys = Object.keys(storage) as (keyof typeof storage)[];

      for (const key of keys) {
        const value = storage[key];
        if (value) {
          cookies.set(key, value, { sameSite: 'strict', expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) });
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
