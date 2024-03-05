'use client';

import { bind } from '@croco/utils-structure-react';
import { Button } from '@mantine/core';
import { useLoginButton } from './useLoginButton';

export const LoginButton = bind(useLoginButton, ({ login }) => <Button onClick={login}>로그인</Button>);
