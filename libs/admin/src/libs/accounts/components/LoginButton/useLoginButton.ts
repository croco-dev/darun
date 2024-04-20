import { useAuthService, useAuthState } from '@darun/provider-auth/client';

export function useLoginButton() {
  const { isLoading } = useAuthState();
  const authService = useAuthService();
  const login = () => {
    authService.setRedirectUrl('/');
    authService.signInWithGoogle();
  };

  return {
    login,
    isLoading,
  };
}
