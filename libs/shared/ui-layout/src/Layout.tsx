import { ReactNode } from 'react';

import { Footer } from './libs/Footer';
import { Header } from './libs/Header';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-dark-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-md focus:ring-2 focus:ring-dark-900/60"
      >
        본문 바로가기
      </a>
      <Header />
      <div id="main-content" tabIndex={-1} className="flex flex-1 flex-col focus:outline-none">
        {children}
      </div>
      <Footer />
    </div>
  );
}
