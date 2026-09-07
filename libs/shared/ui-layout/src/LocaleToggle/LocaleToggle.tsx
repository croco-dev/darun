'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '../i18n/navigation';

const LOCALES = ['ko', 'en'] as const;

export const LocaleToggle = () => {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggle = () => {
    const nextLocale = locale === 'ko' ? 'en' : 'ko';
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <div
      role="radiogroup"
      aria-label="Change language"
      className="inline-flex gap-1 rounded-full border border-dark-150 bg-surface-100 p-0.5 shadow-2xs"
    >
      {LOCALES.map(loc => {
        const isActive = locale === loc;
        return (
          <button
            key={loc}
            type="button"
            onClick={isActive ? undefined : toggle}
            aria-checked={isActive}
            role="radio"
            aria-label={loc === 'ko' ? '한국어' : 'English'}
            disabled={isActive}
            className={`
              rounded-full px-3 py-1 text-sm font-medium transition-colors duration-200
              ${isActive ? 'bg-dark-900 text-white cursor-default' : 'bg-transparent text-dark-700 hover:bg-surface-200 cursor-pointer'}
            `}
          >
            {loc === 'ko' ? 'Ko' : 'En'}
          </button>
        );
      })}
    </div>
  );
};
