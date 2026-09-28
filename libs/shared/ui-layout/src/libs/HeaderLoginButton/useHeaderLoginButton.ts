import { useAuthService, useAuthState } from '@darun/provider-auth/client';

export function useHeaderLoginButton() {
  const authService = useAuthService();
  const { isLoggedIn, isLoading } = useAuthState();
  const login = async () => {
    try {
      await authService.signInWithGoogle();
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request')
      ) {
        return;
      }
      console.error('Failed to sign in with Google', error);
    }
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
