'use client';

import { GoogleButton } from '@darun/ui-admin';

import { useLoginButton } from './useLoginButton';

export function LoginButton() {
  const { login, isLoading } = useLoginButton();

  return (
    <GoogleButton fullWidth onClick={login} loading={isLoading}>
      Google로 로그인
    </GoogleButton>
  );
}
