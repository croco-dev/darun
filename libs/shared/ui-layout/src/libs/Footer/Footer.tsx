'use client';

import { ContentArea, ExternalLink, Logo } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { useTranslations } from 'next-intl';
import { LocaleToggle } from '../../LocaleToggle';
import { useFooter } from './useFooter';

export const Footer = bind(useFooter, ({ aboutUrl }) => {
  const t = useTranslations('Layout.footer');

  return (
    <footer className="mt-auto border-t border-dark-150/80 bg-surface-50/90 py-8 backdrop-blur-xs md:py-10">
      <ContentArea>
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Logo size={22} title={t('brandName')} />
              <span className="text-sm font-extrabold tracking-tight text-dark-900">{t('brandName')}</span>
              <span className="text-xs text-dark-300">/</span>
              <span className="text-xs sm:text-sm text-dark-500 tabular-nums">&copy; {new Date().getFullYear()} Croco</span>
            </div>
            <nav className="flex flex-wrap items-center gap-x-4 gap-y-1.5" aria-label="Footer navigation">
              <Link
                href={aboutUrl}
                className="text-sm font-medium text-dark-600 transition-all duration-200 hover:text-dark-900 active:scale-95 focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
              >
                {t('about')}
              </Link>
              <a
                href="https://forms.gle/nDPFKAYSuoGg2J3MA"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1 text-sm font-medium text-dark-600 transition-all duration-200 hover:text-dark-900 active:scale-95 focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
              >
                <span>{t('contact')}</span>
                <ExternalLink
                  size={12}
                  className="stroke-[2] text-dark-400 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-dark-900"
                />
              </a>
            </nav>
            <p className="max-w-xl text-xs leading-relaxed text-dark-500 break-keep sm:text-sm">{t('disclaimer')}</p>
          </div>
          <div className="flex shrink-0 items-center">
            <LocaleToggle />
          </div>
        </div>
      </ContentArea>
    </footer>
  );
});
