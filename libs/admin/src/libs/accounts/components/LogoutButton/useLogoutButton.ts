import { useAuthService } from '@darun/provider-auth/client';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

export function useLogoutButton() {
  const authService = useAuthService();
  const { push } = useRouter();

  const logout = async () => {
    await authService.signOut();
    notifications.show({ message: '로그아웃되었습니다.', color: 'teal' });
    push('/');
  };

  return {
    logout,
  };
}
