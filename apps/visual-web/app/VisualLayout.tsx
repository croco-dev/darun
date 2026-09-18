import { ContentArea, Logo } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { ReactNode } from 'react';

export function VisualLayout({ children }: { children: ReactNode }) {
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
              <span className="text-base font-bold tracking-tight text-dark-900">
                다른 <span className="font-medium text-dark-400">Visual</span>
              </span>
            </Link>
          </div>
        </ContentArea>
      </header>
      <div id="main-content" tabIndex={-1} className="flex flex-1 flex-col focus:outline-none">
        {children}
      </div>
      <footer className="border-t border-dark-150 bg-surface-50/75 py-6">
        <ContentArea>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-dark-400">
              © {new Date().getFullYear()} Croco · 다른 Visual은 서비스 화면과 UX를 소개하는 다른(darun)의 공간입니다.
            </p>
            <a
              href="https://darun.io/ko"
              className="rounded-lg font-semibold text-dark-500 transition-colors duration-200 hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
            >
              darun.io 서비스 비교
            </a>
          </div>
        </ContentArea>
      </footer>
    </div>
  );
}
