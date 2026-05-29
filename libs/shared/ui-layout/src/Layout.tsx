import { ReactNode } from 'react';

import { Footer } from './libs/Footer';
import { Header } from './libs/Header';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-white focus:text-dark-900"
      >
        본문으로 건너뛰기
      </a>
      <div className="flex flex-col">
        <Header />
        <div id="main-content">{children}</div>
        <Footer />
      </div>
    </>
  );
}
