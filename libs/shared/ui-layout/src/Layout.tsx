'use client';

import { ArrowUp } from '@darun/ui';
import { useLocale, useTranslations } from 'next-intl';
import { ReactNode, useEffect, useState } from 'react';

import { Footer } from './libs/Footer';
import { Header } from './libs/Header';

function ScrollToTopButton() {
  const locale = useLocale();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label={locale === 'ko' ? '맨 위로 이동' : 'Scroll to top'}
      title={locale === 'ko' ? '맨 위로 이동' : 'Scroll to top'}
      className={`fixed bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-dark-150/90 bg-white/90 text-dark-700 shadow-elevated backdrop-blur-md transition-all duration-300 hover:border-dark-300 hover:bg-white hover:text-dark-950 hover:shadow-card-hover active:scale-95 motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2 ${visible ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'}`}
    >
      <ArrowUp size={18} className="stroke-[2.25]" />
    </button>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const t = useTranslations('Layout');
  const skipToContentText = t('skipToContent');

  return (
    <div className="flex min-h-dvh flex-col bg-surface-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-dark-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-md focus:ring-2 focus:ring-dark-900/60"
      >
        {skipToContentText}
      </a>
      <Header />
      <div id="main-content" tabIndex={-1} className="flex flex-1 flex-col focus:outline-none">
        {children}
      </div>
      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
