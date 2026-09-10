'use client';

import { Button, ContentArea, Logo } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { useTranslations } from 'next-intl';
import { Suspense } from 'react';
import { HeaderLoginButton } from '../HeaderLoginButton';
import { HeaderSearchForm } from '../HeaderSearchForm';
import { useHeader } from './useHeader';

export const Header = bind(useHeader, ({ headerUrl, rankingUrl, browseUrl, isRanking, isBrowse }) => {
  const t = useTranslations('Layout.header');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-dark-150 bg-white/85 backdrop-blur-md shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <ContentArea>
        <div className="flex w-full items-center gap-4 py-3 md:gap-6">
          <div className="flex shrink-0 items-center gap-4 md:gap-6">
            <Link href={headerUrl} className="block transition-opacity duration-200 hover:opacity-80">
              <Logo size={36} />
            </Link>
            <nav className="hidden items-center gap-1 sm:flex" aria-label={t('mainMenuAriaLabel')}>
              <Link
                href={rankingUrl}
                aria-current={isRanking ? 'page' : undefined}
                className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 ${
                  isRanking
                    ? 'bg-surface-100 font-bold text-dark-950 shadow-2xs'
                    : 'text-dark-700 hover:bg-surface-100 hover:text-dark-950'
                }`}
              >
                {t('ranking')}
              </Link>
              <Link
                href={browseUrl}
                aria-current={isBrowse ? 'page' : undefined}
                className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 ${
                  isBrowse
                    ? 'bg-surface-100 font-bold text-dark-950 shadow-2xs'
                    : 'text-dark-700 hover:bg-surface-100 hover:text-dark-950'
                }`}
              >
                {t('browse')}
              </Link>
            </nav>
          </div>
          <Suspense fallback={<></>}>
            <HeaderSearchForm />
          </Suspense>
          <div className="hidden h-max shrink-0 items-center gap-2 md:flex">
            <HeaderLoginButton />
            <a target="_blank" rel="noopener noreferrer" href="https://forms.gle/nDPFKAYSuoGg2J3MA">
              <Button variant="shadow" color="primary" size="sm">
                {t('submit')}
              </Button>
            </a>
          </div>
        </div>
      </ContentArea>
    </header>
  );
});
