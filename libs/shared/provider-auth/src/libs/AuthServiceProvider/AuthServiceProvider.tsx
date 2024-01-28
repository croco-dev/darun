'use client';

import { AuthService } from '@darun/utils-auth-service-core';
import { createContext, ReactNode, useContext } from 'react';

export type AuthServiceProviderProps = {
  children: ReactNode;
  authService: AuthService;
};

const AuthServiceContext = createContext<{ authService?: AuthService }>({
  authService: undefined,
});

export const AuthServiceProvider = ({ children, authService }: AuthServiceProviderProps) => {
  return <AuthServiceContext.Provider value={{ authService }}>{children}</AuthServiceContext.Provider>;
};

export const useAuthService = () => {
  const { authService } = useContext(AuthServiceContext);

  if (authService === undefined) {
    throw new Error('AuthService was used without providing.');
  }

  return authService;
};
