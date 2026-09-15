import { useAuthService } from '@darun/provider-auth/client';
import { useNavigate } from '@darun/utils-router';
import { notifications } from '@mantine/notifications';

export type LogoutButtonProps = {
  variant?: 'sidebar' | 'contained';
};

export function useLogoutButton(props: LogoutButtonProps = {}) {
  const variant = props?.variant ?? 'sidebar';
  const authService = useAuthService();
  const navigate = useNavigate();

  const logout = async () => {
    await authService.signOut();
    notifications.show({ message: '로그아웃되었습니다.', color: 'teal' });
    navigate('/auth/login');
  };

  return {
    logout,
    variant,
  };
}
