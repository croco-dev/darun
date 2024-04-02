'use client';

import { bind } from '@croco/utils-structure-react';
import { GoogleButton } from '@uis';
import { useLoginButton } from './useLoginButton';

export const LoginButton = bind(useLoginButton, ({ login }) => (
  <GoogleButton fullWidth onClick={login}>
    Google로 로그인
  </GoogleButton>
));
