import { useAuthService } from '@darun/provider-auth/client';
import { useNavigate } from '@darun/utils-router';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';

export type LogoutButtonProps = {
  variant?: 'sidebar' | 'contained';
};

export function useLogoutButton(props: LogoutButtonProps = {}) {
  const variant = props?.variant ?? 'sidebar';
  const authService = useAuthService();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await authService.signOut();
      notifications.show({ message: '로그아웃되었습니다.', color: 'teal' });
      navigate('/auth/login');
    } catch (error) {
      notifications.show({
        title: '로그아웃 실패',
        message: error instanceof Error ? error.message : '로그아웃 중 오류가 발생했습니다.',
        color: 'red',
      });
      setIsLoggingOut(false);
    }
  };

  return {
    logout,
    variant,
    isLoggingOut,
  };
}
