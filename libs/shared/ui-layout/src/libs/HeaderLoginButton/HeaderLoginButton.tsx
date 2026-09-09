'use client';

import { Button } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { useTranslations } from 'next-intl';
import { useHeaderLoginButton } from './useHeaderLoginButton';

export const HeaderLoginButton = bind(useHeaderLoginButton, ({ isLoading, isLoggedIn, login, logout }) => {
  const t = useTranslations('Layout.header');

  return isLoading ? null : isLoggedIn ? (
    <Button type="button" kind="text" size="sm" onClick={logout}>
      {t('logout')}
    </Button>
  ) : (
    <Button type="button" kind="text" size="sm" onClick={login}>
      {t('login')}
    </Button>
  );
});
