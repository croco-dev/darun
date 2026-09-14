import { useAuthService } from '@darun/provider-auth/client';
import { useNavigate } from '@darun/utils-router';
import { notifications } from '@mantine/notifications';
import { useRef, useState } from 'react';

export function useLogoutButton() {
  const authService = useAuthService();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const isLoggingOutRef = useRef(false);

  const logout = async () => {
    if (isLoggingOutRef.current || loading) return;
    isLoggingOutRef.current = true;
    setLoading(true);
    try {
      await authService.signOut();
      notifications.show({ message: '로그아웃되었습니다.', color: 'teal' });
      navigate('/');
    } catch {
      notifications.show({ message: '로그아웃에 실패했습니다.', color: 'red' });
    } finally {
      isLoggingOutRef.current = false;
      setLoading(false);
    }
  };

  return {
    logout,
    loading,
  };
}
