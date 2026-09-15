import { useAuthService, useAuthState } from '@darun/provider-auth/client';
import { useSearchParams } from 'next/navigation';

export function useLoginButton() {
  const { isLoading } = useAuthState();
  const authService = useAuthService();
  const searchParams = useSearchParams();

  const login = () => {
    const redirectParam = searchParams.get('redirect');
    const redirectUrl =
      redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//') ? redirectParam : '/';
    authService.setRedirectUrl(redirectUrl);
    authService.signInWithGoogle();
  };

  return {
    login,
    isLoading,
  };
}
