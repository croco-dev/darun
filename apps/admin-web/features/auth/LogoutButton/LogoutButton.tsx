'use client';

import { bind } from '@darun/utils-structure-react';
import { LogOut } from 'lucide-react';
import { useLogoutButton } from './useLogoutButton';

export const LogoutButton = bind(useLogoutButton, ({ logout }) => (
  <button
    type="button"
    className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition motion-reduce:transition-none outline-none select-none text-left focus-visible:ring-2 focus-visible:ring-red-600/40"
    onClick={logout}
  >
    <LogOut className="w-5 h-5 transition-colors text-red-500" strokeWidth={1.5} />
    <span>로그아웃</span>
  </button>
));
