'use client';

import { useAuthService, useAuthState } from '@darun/provider-auth/client';
import { Button } from '@darun/ui';

/**
 * M5 로그인 버튼. visual-web Firebase 로그인 — 저장 안내에서 /saves로 복귀.
 */
export function VisualLoginButton({ redirectTo = '/saves' }: { redirectTo?: string }) {
  const authService = useAuthService();
  const { isError, isLoading, retry } = useAuthState();

  const login = async () => {
    authService.setRedirectUrl(redirectTo);
    await authService.signInWithGoogle();
  };

  if (isError) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p role="alert" className="text-sm text-dark-600">
          로그인 상태를 확인하지 못했어요.
        </p>
        <Button type="button" variant="contained" color="primary" size="md" onClick={retry}>
          다시 확인
        </Button>
      </div>
    );
  }

  return (
    <Button type="button" variant="contained" color="primary" size="md" disabled={isLoading} onClick={login}>
      Google로 로그인
    </Button>
  );
}
