import { useAuthService, useAuthState } from '@darun/provider-auth/client';

export function useHeaderLoginButton() {
  const authService = useAuthService();
  const { isLoggedIn, isLoading } = useAuthState();
  const login = () => {
    authService.signInWithGoogle();
  };

  const logout = async () => {
    await authService.signOut();
  };

  return {
    isLoggedIn,
    isLoading,
    login,
    logout,
  };
}
