'use client';

import { useAuthService } from '@darun/provider-auth/client';
import { Button } from '@darun/ui';

/**
 * M5 로그인 버튼. visual-web Firebase 로그인 — 저장 안내에서 /saves로 복귀.
 */
export function VisualLoginButton({ redirectTo = '/saves' }: { redirectTo?: string }) {
  const authService = useAuthService();

  const login = async () => {
    authService.setRedirectUrl(redirectTo);
    await authService.signInWithGoogle();
  };

  return (
    <Button type="button" variant="contained" color="primary" size="md" onClick={login}>
      Google로 로그인
    </Button>
  );
}
