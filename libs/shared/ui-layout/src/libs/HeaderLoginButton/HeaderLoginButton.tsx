'use client';

import { bind } from '@croco/utils-structure-react';
import { TextButton } from '@darun/ui-foundation';
import { useHeaderLoginButton } from './useHeaderLoginButton';

export const HeaderLoginButton = bind(useHeaderLoginButton, ({ login }) => (
  <TextButton onClick={login}>로그인</TextButton>
));
