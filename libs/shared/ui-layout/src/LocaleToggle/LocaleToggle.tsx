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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={locale === 'ko' ? '언어 변경' : 'Change language'}
      onKeyDown={handleKeyDown}
      className="inline-flex gap-0.5 rounded-full border border-dark-150/80 bg-surface-100 p-0.5 shadow-2xs"
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
            tabIndex={isActive ? 0 : -1}
            className={`
              rounded-full px-3 py-1 text-xs font-semibold select-none transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none
              ${isActive ? 'bg-dark-900 text-white shadow-xs cursor-default' : 'bg-transparent text-dark-600 hover:bg-surface-200/80 hover:text-dark-900 cursor-pointer'}
            `}
          >
            {loc === 'ko' ? 'Ko' : 'En'}
          </button>
        );
      })}
    </div>
  );
};
