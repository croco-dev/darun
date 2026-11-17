'use client';

import { ChevronDown } from '@darun/ui/icons';
import { usePathname } from '@darun/utils-router';
import { type KeyboardEvent, type ReactNode, useRef, useState } from 'react';
import { Navbar } from '../Navbar';

const adminNavigationId = 'admin-navigation';

function AdminLayout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  function closeMenu(focusTarget: 'toggle' | 'main') {
    if (!menuOpen) return;

    setMenuOpen(false);
    const toggle = menuToggleRef.current;
    if (toggle && getComputedStyle(toggle).display !== 'none') {
      const target = focusTarget === 'toggle' ? toggle : mainRef.current;
      target?.focus({ preventScroll: true });
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      closeMenu('toggle');
    }
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-surface-100 lg:h-screen lg:flex-row">
      <div className="shrink-0" onKeyDown={handleMenuKeyDown}>
        <button
          ref={menuToggleRef}
          type="button"
          aria-expanded={menuOpen}
          aria-controls={adminNavigationId}
          className="flex min-h-11 w-full items-center justify-between gap-3 border-b border-dark-200 bg-white px-5 py-2 text-sm font-semibold text-dark-900 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dark-900 lg:hidden"
          onClick={() => setMenuOpen(open => !open)}
        >
          메뉴
          <ChevronDown aria-hidden="true" className={`size-4 ${menuOpen ? 'rotate-180' : ''}`} />
        </button>
        <Navbar id={adminNavigationId} mobileOpen={menuOpen} onNavigate={() => closeMenu('main')} />
      </div>
      <main
        ref={mainRef}
        id="admin-main-content"
        tabIndex={-1}
        className="min-h-0 min-w-0 flex-1 overflow-auto motion-reduce:transition-none focus:outline-none"
      >
        {children}
      </main>
    </div>
  );
}

export const AppShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  if (pathname?.startsWith('/auth')) {
    return <div className="w-full min-h-screen bg-surface-100">{children}</div>;
  }

  return <AdminLayout>{children}</AdminLayout>;
};
