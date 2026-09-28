import { useAuthService, useAuthState } from '@darun/provider-auth/client';
import { useSearchParams } from '@darun/utils-router';
import { notifications } from '@mantine/notifications';

export function useLoginButton() {
  const { isLoading } = useAuthState();
  const authService = useAuthService();
  const searchParams = useSearchParams();

  const login = async () => {
    if (isLoading) return;
    try {
      const redirectParam = searchParams.get('redirect');
      const redirectUrl =
        redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//') ? redirectParam : '/';
      authService.setRedirectUrl(redirectUrl);
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
