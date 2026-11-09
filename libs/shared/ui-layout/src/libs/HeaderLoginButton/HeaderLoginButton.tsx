'use client';

import { Button } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { useTranslations } from 'next-intl';
import { useHeaderLoginButton } from './useHeaderLoginButton';

export const HeaderLoginButton = bind(
  useHeaderLoginButton,
  ({ isLoading, isLoggedIn, isError, retry, pendingAction, actionError, login, logout }) => {
    const t = useTranslations('Layout.header');

    if (isError) {
      return (
        <div className="flex max-w-48 flex-col items-end gap-1 text-right">
          <p role="alert" className="text-xs text-dark-600">
            {t('authError')}
          </p>
          <Button type="button" kind="text" size="sm" onClick={retry}>
            {t('authRetry')}
          </Button>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div
          className="h-8 w-14 animate-pulse rounded-xl bg-surface-200 motion-reduce:animate-none"
          aria-hidden="true"
        />
      );
    }

    let label = t(isLoggedIn ? 'logout' : 'login');
    if (pendingAction) label = t(pendingAction === 'login' ? 'loginPending' : 'logoutPending');

    return (
      <div className="flex max-w-48 flex-col items-end gap-1 text-right">
        <Button
          type="button"
          kind="text"
          size="sm"
          className="min-h-[36px] sm:min-h-0 select-none whitespace-nowrap active:scale-[0.98] motion-reduce:transform-none"
          onClick={isLoggedIn ? logout : login}
          disabled={pendingAction !== null}
          aria-busy={pendingAction !== null}
        >
          {label}
        </Button>
        {actionError && (
          <p role="alert" className="break-keep text-xs text-dark-600">
            {t(actionError === 'login' ? 'loginError' : 'logoutError')}
          </p>
        )}
      </div>
    );
  }
);
