'use client';

import { bind } from '@croco/utils-structure-react';
import { ContainedButton, ContentArea, Logo } from '@darun/ui-foundation';
import { Link } from '@darun/utils-router';
import { Suspense } from 'react';
import { HeaderLoginButton } from '../HeaderLoginButton';
import { HeaderSearchForm } from '../HeaderSearchForm';
import { useHeader } from './useHeader';

export const Header = bind(useHeader, ({ headerUrl, rankingUrl, browseUrl }) => (
  <nav className="w-full">
    <ContentArea>
      <div className="flex w-full items-center gap-6 py-[14px]">
        <div className="flex shrink-0 items-center gap-6">
          <div className="flex items-center">
            <Link href={headerUrl} className="block">
              <Logo size={36} />
            </Link>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <Link href={rankingUrl} className="text-[15px] font-medium text-dark-700 no-underline">
              랭킹
            </Link>
            <Link href={browseUrl} className="text-[15px] font-medium text-dark-700 no-underline">
              둘러보기
            </Link>
          </div>
        </div>
        <Suspense fallback={<></>}>
          <HeaderSearchForm />
        </Suspense>
        <div className="hidden h-max shrink-0 items-center gap-2 sm:flex">
          <HeaderLoginButton />
          <a target="_blank" rel="noopener noreferrer" href="https://forms.gle/nDPFKAYSuoGg2J3MA">
            <ContainedButton kind="primary">제보하기</ContainedButton>
          </a>
        </div>
      </div>
    </ContentArea>
  </nav>
));
