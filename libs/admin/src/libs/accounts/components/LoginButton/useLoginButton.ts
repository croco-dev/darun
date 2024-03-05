import { useAuthService } from '@darun/provider-auth/client';

export function useLoginButton() {
  const authService = useAuthService();
  const login = () => {
    authService.signInWithGoogle();
  };

  return {
    login,
  };
}
