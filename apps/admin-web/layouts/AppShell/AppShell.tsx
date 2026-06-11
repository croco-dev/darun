'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '../Navbar';

export const AppShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith('/auth');

  if (isAuthPage) {
    return <div className="w-full min-h-screen bg-dark-50">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-dark-50 overflow-hidden">
      <Navbar />
      <main className="flex-1 h-screen overflow-auto motion-reduce:transition-none">
        {children}
      </main>
    </div>
  );
};
