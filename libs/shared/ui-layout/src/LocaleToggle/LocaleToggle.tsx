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
      className="inline-flex gap-1 rounded-full bg-brand-100 p-0.5"
    >
      {LOCALES.map((loc) => {
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
              cursor-pointer rounded-full px-3 py-1 text-sm font-medium transition-colors duration-200
              ${isActive ? 'bg-brand-500 text-white' : 'bg-transparent text-brand-700 hover:bg-brand-200'}
              ${!isActive ? 'cursor-pointer' : 'cursor-default'}
            `}
          >
            {loc === 'ko' ? 'Ko' : 'En'}
          </button>
        );
      })}
    </div>
  );
};
