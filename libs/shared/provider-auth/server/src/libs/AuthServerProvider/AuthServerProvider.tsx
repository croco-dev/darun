import { AuthService } from '@darun/utils-auth-service-core';
import { authChecker } from '../AuthChecker';

type AuthServerProviderProps = {
  authService?: AuthService;
  authServiceFactory?: () => AuthService;
};

export const initAuthProvider = ({ authService, authServiceFactory }: AuthServerProviderProps) => {
  if (authServiceFactory) {
    authChecker.init(authServiceFactory);
  } else if (authService) {
    authChecker.init(authService);
  }
};
