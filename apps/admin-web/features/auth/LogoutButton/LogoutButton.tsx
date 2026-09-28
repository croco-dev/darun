'use client';

import { LogOut } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { type LogoutButtonProps, useLogoutButton } from './useLogoutButton';

export const LogoutButton = bind<
  LogoutButtonProps,
  {
    logout: () => void;
    variant: 'sidebar' | 'contained';
    isLoggingOut: boolean;
  }
>(useLogoutButton, ({ logout, variant, isLoggingOut }) => {
  if (variant === 'contained') {
    return (
      <button
        type="button"
        disabled={isLoggingOut}
        className="inline-flex min-h-[36px] items-center justify-center gap-2 rounded-lg bg-cherry-600 px-4 py-2 text-sm font-medium text-white hover:bg-cherry-700 active:scale-[0.98] transition motion-reduce:transition-none motion-reduce:transform-none outline-none focus-visible:ring-2 focus-visible:ring-cherry-600/40 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
        onClick={logout}
      >
        <LogOut className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden="true" />
        <span className="whitespace-nowrap">{isLoggingOut ? '로그아웃 중...' : '로그아웃'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={isLoggingOut}
      className="flex min-h-[40px] items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-dark-600 hover:bg-cherry-50 hover:text-cherry-600 active:scale-[0.99] transition motion-reduce:transition-none motion-reduce:transform-none outline-none select-none text-left focus-visible:ring-2 focus-visible:ring-cherry-600/40 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed group"
      onClick={logout}
    >
      <LogOut
        className="w-5 h-5 shrink-0 transition-colors text-dark-400 group-hover:text-cherry-500"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <span className="whitespace-nowrap">{isLoggingOut ? '로그아웃 중...' : '로그아웃'}</span>
    </button>
  );
});
