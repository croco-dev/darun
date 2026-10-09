'use client';

import { ContentArea, Logo } from '@darun/ui';
import { Link, usePathname } from '@darun/utils-router';
import { ReactNode, useEffect } from 'react';
import { VISUAL_NAV_TABS, isTabActive } from './visualNav';

export function VisualLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const focusSearch = () => {
    const input = document.querySelector<HTMLInputElement>('[data-visual-search]');
    input?.focus();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        focusSearch();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-dark-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-md focus:ring-2 focus:ring-dark-900/60"
      >
        본문으로 건너뛰기
      </a>
      <header className="sticky top-0 z-40 w-full border-b border-dark-150 bg-white/85 backdrop-blur-md">
        <ContentArea>
          <div className="flex w-full items-center justify-between gap-4 py-3">
            <Link
              href="/"
              className="flex items-center gap-2.5 rounded-xl transition-opacity duration-200 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
            >
              <Logo size={32} title="다른 Visual 홈" />
              <span className="text-base font-bold tracking-tight text-dark-900 select-none">
                다른 <span className="font-medium text-dark-400">Visual</span>
              </span>
            </Link>
            <nav aria-label="Visual 탐색" className="flex items-center gap-1 overflow-x-auto">
              {VISUAL_NAV_TABS.map(tab => {
                const active = isTabActive(pathname, tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    aria-current={active ? 'page' : undefined}
                    className={`relative rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2 ${
                      active ? 'text-dark-900' : 'text-dark-500 hover:text-dark-900'
                    }`}
                  >
                    {tab.label}
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-dark-900"
                      />
                    )}
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={focusSearch}
                className="ml-1 hidden items-center gap-1.5 rounded-lg border border-dark-150 bg-white px-2.5 py-1.5 text-xs font-medium text-dark-500 shadow-2xs transition-colors duration-200 hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2 sm:inline-flex"
                aria-label="검색으로 이동 (⌘K)"
              >
                <span aria-hidden="true">⌘K</span>
              </button>
            </nav>
          </div>
        </ContentArea>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
      <footer className="border-t border-dark-150 bg-surface-50/75 py-6">
        <ContentArea>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-dark-400 break-words [word-break:keep-all]">
              © <span className="tabular-nums">{new Date().getFullYear()}</span> Croco · 다른 Visual은 서비스 화면과
              UX를 소개하는 다른(darun)의 공간입니다.
            </p>
            <a
              href="https://darun.io/ko"
              className="inline-flex min-h-[44px] items-center rounded-lg text-xs font-semibold text-dark-500 whitespace-nowrap transition-colors duration-200 hover:text-dark-900 active:scale-[0.98] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2 sm:min-h-0 sm:text-sm"
            >
              darun.io 서비스 비교
            </a>
          </div>
        </ContentArea>
      </footer>
    </div>
  );
}
