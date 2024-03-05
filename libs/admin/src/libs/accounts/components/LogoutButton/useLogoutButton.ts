import { useAuthService } from '@darun/provider-auth/client';

export function useLogoutButton() {
  const authService = useAuthService();
  const logout = async () => {
    await authService.signOut();
  };

  return {
    logout,
  };
}
