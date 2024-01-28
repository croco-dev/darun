import { AuthService } from '@darun/utils-auth-service-core';
import { getCookies } from 'next-client-cookies/server';
import { authChecker } from '../AuthChecker';

type AuthServerProviderProps = {
  authService: AuthService;
};

export const initAuthProvider = ({ authService }: AuthServerProviderProps) => {
  const cookies = getCookies();

  authService.setAuthStorage({
    get: key => cookies.get(key) ?? null,
    clear() {},
    set() {},
  });
  authChecker.init(authService);
};
