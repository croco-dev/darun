import { useAuthService, useAuthState } from '@darun/provider-auth/client';
import { notifications } from '@mantine/notifications';
import { useSearchParams } from 'next/navigation';

export function useLoginButton() {
  const { isLoading } = useAuthState();
  const authService = useAuthService();
  const searchParams = useSearchParams();

  const login = () => {
    if (isLoading) return;
    try {
      const redirectParam = searchParams.get('redirect');
      const redirectUrl =
        redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//') ? redirectParam : '/';
      authService.setRedirectUrl(redirectUrl);
      authService.signInWithGoogle();
    } catch (error) {
      notifications.show({
        title: '로그인 실패',
        message: error instanceof Error ? error.message : 'Google 로그인 중 오류가 발생했습니다.',
        color: 'red',
      });
    }
  };

  return {
    login,
    isLoading,
  };
}
