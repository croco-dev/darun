'use client';

import { GoogleButton } from '@darun/ui-admin';

import { useLoginButton } from './useLoginButton';

export function LoginButton() {
  const { login, isLoading, isError, retry } = useLoginButton();

  if (isError) {
    return (
      <div className="flex flex-col gap-2">
        <p role="alert" className="text-sm text-dark-600">
          로그인 상태를 확인하지 못했어요.
        </p>
        <GoogleButton fullWidth onClick={retry}>
          다시 확인
        </GoogleButton>
      </div>
    );
  }

  return (
    <GoogleButton fullWidth onClick={login} loading={isLoading} disabled={isLoading}>
      Google로 로그인
    </GoogleButton>
  );
}
