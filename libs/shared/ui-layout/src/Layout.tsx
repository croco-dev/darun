import { ReactNode } from 'react';

import { Footer } from './libs/Footer';
import { Header } from './libs/Header';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      {children}
      <Footer />
    </div>
  );
}
