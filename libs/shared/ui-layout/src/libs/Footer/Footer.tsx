import { ContentArea } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { useTranslations } from 'next-intl';
import { useFooter } from './useFooter';

export const Footer = bind(useFooter, ({ aboutUrl }) => {
  const t = useTranslations('Layout.footer');

  return (
    <footer className="mt-auto border-t border-dark-150 py-8 md:py-10">
      <ContentArea>
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-dark-900">다른</span>
              <span className="text-xs text-dark-400">/</span>
              <span className="text-sm text-dark-500">&copy; {new Date().getFullYear()} Croco</span>
            </div>
            <nav className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Link
                href={aboutUrl}
                className="text-sm text-dark-600 transition-colors duration-200 hover:text-dark-900 hover:underline focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
              >
                {t('about')}
              </Link>
              <a
                href="https://forms.gle/nDPFKAYSuoGg2J3MA"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-dark-600 transition-colors duration-200 hover:text-dark-900 hover:underline focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
              >
                {t('contact')}
              </a>
            </nav>
            <p className="max-w-xl text-sm leading-relaxed text-dark-500">
              {t('disclaimer')}
            </p>
          </div>
        </div>
      </ContentArea>
    </footer>
  );
});
