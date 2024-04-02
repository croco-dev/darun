import { useAuthService } from '@darun/provider-auth/client';
import { useRouter } from 'next/navigation';

export function useLogoutButton() {
  const authService = useAuthService();
  const { push } = useRouter();

  const logout = async () => {
    await authService.signOut();
    push('/');
  };

  return {
    logout,
  };
}
