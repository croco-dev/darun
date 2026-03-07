'use client';

import { bind } from '@croco/utils-structure-react';
import { GoogleButton } from '@darun/admin/src/libs/uis';
import { useLoginButton } from './useLoginButton';

export const LoginButton = bind(useLoginButton, ({ login, isLoading }) => (
  <GoogleButton fullWidth onClick={login} loading={isLoading}>
    Google로 로그인
  </GoogleButton>
));
