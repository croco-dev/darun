import { useAuthService } from '@darun/provider-auth/client';
import { useNavigate } from '@darun/utils-router';
import { notifications } from '@mantine/notifications';

export function useLogoutButton() {
  const authService = useAuthService();
  const navigate = useNavigate();

  const logout = async () => {
    await authService.signOut();
    notifications.show({ message: '로그아웃되었습니다.', color: 'teal' });
    navigate('/');
  };

  return {
    logout,
  };
}
