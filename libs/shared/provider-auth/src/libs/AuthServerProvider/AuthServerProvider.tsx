import { AuthService } from '@darun/utils-auth-service-core';
import { authChecker } from '../AuthChecker';

type AuthServerProviderProps = {
  authService: AuthService;
};

export const initAuthProvider = ({ authService }: AuthServerProviderProps) => {
  authChecker.init(authService);
};
