import { useAuthService, useAuthState } from '@darun/provider-auth/client';
import { notifications } from '@mantine/notifications';
import { useRef, useState } from 'react';

export function useLoginButton() {
  const { isLoading } = useAuthState();
  const authService = useAuthService();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const isLoggingInRef = useRef(false);

  const login = async () => {
    if (isLoggingInRef.current || isLoggingIn || isLoading) return;
    isLoggingInRef.current = true;
    setIsLoggingIn(true);
    try {
      authService.setRedirectUrl('/');
      await authService.signInWithGoogle();
    } catch (error) {
      notifications.show({
        title: '로그인 실패',
        message: error instanceof Error ? error.message : 'Google 로그인에 실패했습니다.',
        color: 'red',
      });
    } finally {
      isLoggingInRef.current = false;
      setIsLoggingIn(false);
    }
  };

  return {
    login,
    isLoading: isLoading || isLoggingIn,
  };
}
