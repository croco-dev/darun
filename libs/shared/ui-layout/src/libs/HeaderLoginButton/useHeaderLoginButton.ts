import { useAuthService } from '@darun/provider-auth';

export function useHeaderLoginButton() {
  const authService = useAuthService();

  const login = () => {
    authService.signInWithGoogle();
  };

  return {
    login,
  };
}
