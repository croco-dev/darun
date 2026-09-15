'use client';

import { Logo } from '@darun/ui-admin';
import { Link } from '@darun/utils-router';
import { Archive, Building2, Home, Newspaper, Sliders } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { LogoutButton } from '../../features/auth/LogoutButton';

export const navItems = [
  { link: '/', label: '대시보드', icon: Home },
  { link: '/products', label: '서비스', icon: Archive },
  { link: '/companies', label: '기업 관리', icon: Building2 },
  { link: '/magazines', label: '매거진', icon: Newspaper },
  { link: '/settings/llm', label: 'LLM 설정', icon: Sliders },
];

export function isNavItemActive(pathname: string | null | undefined, itemLink: string): boolean {
  if (!pathname) {
    return false;
  }
  if (itemLink === '/') {
    return pathname === '/';
  }
  return pathname === itemLink || pathname.startsWith(`${itemLink}/`);
}

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="관리자 사이드 메뉴"
      className="h-screen w-[280px] p-5 flex flex-col shrink-0 border-r border-dark-200 bg-white shadow-sm"
    >
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        <div className="pb-5 mb-6 border-b border-dark-200 flex items-center justify-between shrink-0">
          <Link href="/">
            <div className="flex items-center gap-2 px-1 hover:opacity-85 transition">
              <Logo size={32} />
              <span className="text-lg font-bold text-dark-900 select-none">다른 관리자</span>
            </div>
          </Link>
          <code className="font-mono font-bold text-xs bg-dark-100 text-dark-700 px-1.5 py-0.5 rounded border border-dark-200">
            {process.env['NEXT_PUBLIC_INFRA_ENV'] === 'local' || process.env['NODE_ENV'] === 'development'
              ? 'local'
              : 'prod'}
          </code>
        </div>

        <div className="flex flex-col gap-1">
          {navItems.map(item => {
            const isActive = isNavItemActive(pathname, item.link);
            return (
              <Link
                key={item.link}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition duration-150 motion-reduce:transition-none outline-none select-none focus-visible:ring-2 focus-visible:ring-dark-900/40 ${
                  isActive
                    ? 'bg-dark-900 text-white shadow-sm font-semibold'
                    : 'text-dark-600 hover:bg-surface-100 hover:text-dark-900'
                }`}
                href={item.link}
              >
                <item.icon
                  className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : 'text-dark-400'}`}
                  strokeWidth={1.5}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="pt-4 mt-auto border-t border-dark-200 shrink-0 flex flex-col gap-2">
        <div className="px-3 py-2 rounded-lg bg-surface-100/60 border border-dark-150/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <span className="text-xs font-medium text-dark-700">관리자 접속 중</span>
          </div>
          <span className="text-[10px] text-dark-400 font-mono font-semibold uppercase">
            {process.env['NEXT_PUBLIC_INFRA_ENV'] || process.env['NODE_ENV'] || 'local'}
          </span>
        </div>
        <LogoutButton />
      </div>
    </nav>
  );
}
