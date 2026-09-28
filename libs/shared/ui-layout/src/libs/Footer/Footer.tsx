'use client';

import { ContentArea, ExternalLink, Logo } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { useLocale, useTranslations } from 'next-intl';
import { LocaleToggle } from '../../LocaleToggle';
import { useFooter } from './useFooter';

export const Footer = bind(useFooter, ({ aboutUrl }) => {
  const t = useTranslations('Layout.footer');
  const locale = useLocale();

  return (
    <footer className="mt-auto border-t border-dark-150/80 bg-surface-50/90 py-8 backdrop-blur-xs md:py-10">
      <ContentArea>
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 select-none">
              <Logo size={22} title={t('brandName')} />
              <span className="text-sm font-extrabold tracking-tight text-dark-900">{t('brandName')}</span>
              <span className="text-xs text-dark-300">/</span>
              <span className="text-xs sm:text-sm text-dark-500 tabular-nums">
                &copy; {new Date().getFullYear()} Croco
              </span>
            </div>
            <nav
              className="flex flex-wrap items-center gap-x-4 gap-y-1.5"
              aria-label={locale === 'ko' ? '푸터 내비게이션' : 'Footer navigation'}
            >
              <Link
                href={aboutUrl}
                className="inline-flex min-h-[32px] sm:min-h-0 items-center py-1 text-sm font-medium text-dark-600 transition-colors duration-200 select-none active:scale-[0.98] motion-reduce:transform-none hover:text-dark-900 focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
              >
                {t('about')}
              </Link>
              <a
                href="https://forms.gle/nDPFKAYSuoGg2J3MA"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={
                  locale === 'ko' ? `${t('contact')} (새 창에서 열림)` : `${t('contact')} (opens in a new tab)`
                }
                className="group inline-flex min-h-[32px] sm:min-h-0 items-center gap-1 py-1 text-sm font-medium text-dark-600 transition-colors duration-200 select-none active:scale-[0.98] motion-reduce:transform-none hover:text-dark-900 focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
              >
                <span>{t('contact')}</span>
                <ExternalLink
                  size={12}
                  className="shrink-0 stroke-[2] text-dark-400 transition-colors duration-200 group-hover:text-dark-900"
                  aria-hidden="true"
                />
              </a>
            </nav>
            <p className="max-w-xl text-xs leading-relaxed text-dark-500 break-words [word-break:keep-all] sm:text-sm">
              {t('disclaimer')}
            </p>
          </div>
          <div className="flex shrink-0 items-center">
            <LocaleToggle />
          </div>
        </div>
      </ContentArea>
    </footer>
  );
});
