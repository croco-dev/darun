'use client';

import { bind } from '@croco/utils-structure-react';
import { IconLogout } from '@tabler/icons-react';
import classes from './LogoutButton.module.css';
import { useLogoutButton } from './useLogoutButton';

export const LogoutButton = bind(useLogoutButton, ({ logout }) => (
  <a
    href="#"
    className={classes.link}
    onClick={event => {
      event.preventDefault();
      logout();
    }}
  >
    <IconLogout className={classes.linkIcon} stroke={1.5} />
    <span>로그아웃</span>
  </a>
));
