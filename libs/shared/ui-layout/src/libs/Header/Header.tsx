'use client';

import { Button, ContentArea, Logo } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { Suspense } from 'react';
import { HeaderLoginButton } from '../HeaderLoginButton';
import { HeaderSearchForm } from '../HeaderSearchForm';
import { useHeader } from './useHeader';

export const Header = bind(useHeader, ({ headerUrl, rankingUrl, browseUrl }) => (
  <header className="sticky top-0 z-40 w-full border-b border-dark-150 bg-white/95 backdrop-blur">
    <ContentArea>
      <div className="flex w-full items-center gap-4 py-3 md:gap-6">
        <div className="flex shrink-0 items-center gap-4 md:gap-6">
          <Link href={headerUrl} className="block transition-opacity duration-200 hover:opacity-80">
            <Logo size={36} />
          </Link>
          <nav className="hidden items-center gap-1 sm:flex" aria-label="주요 메뉴">
            <Link
              href={rankingUrl}
              className="rounded-lg px-3 py-2 text-sm font-medium text-dark-700 transition-colors duration-200 hover:bg-surface-100 hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
            >
              랭킹
            </Link>
            <Link
              href={browseUrl}
              className="rounded-lg px-3 py-2 text-sm font-medium text-dark-700 transition-colors duration-200 hover:bg-surface-100 hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
            >
              둘러보기
            </Link>
          </nav>
        </div>
        <Suspense fallback={<></>}>
          <HeaderSearchForm />
        </Suspense>
        <div className="hidden h-max shrink-0 items-center gap-2 md:flex">
          <HeaderLoginButton />
          <a target="_blank" rel="noopener noreferrer" href="https://forms.gle/nDPFKAYSuoGg2J3MA">
            <Button size="sm">제보하기</Button>
          </a>
        </div>
      </div>
    </ContentArea>
  </header>
));
