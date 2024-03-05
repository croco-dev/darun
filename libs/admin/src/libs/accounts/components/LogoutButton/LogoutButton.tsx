'use client';

import { bind } from '@croco/utils-structure-react';
import { Button } from '@mantine/core';
import { useLogoutButton } from './useLogoutButton';

export const LogoutButton = bind(useLogoutButton, ({ logout }) => <Button onClick={logout}>로그아웃</Button>);
