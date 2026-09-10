'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '../../i18n/navigation';

export const LanguageSwitcher = () => {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggle = () => {
    const nextLocale = locale === 'ko' ? 'en' : 'ko';
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="cursor-pointer rounded-xl border border-dark-150 bg-white px-3 py-1.5 text-sm font-semibold text-dark-900 shadow-xs transition-all duration-150 ease-out hover:border-dark-300 hover:bg-surface-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
      aria-label={locale === 'ko' ? '영문으로 언어 변경' : 'Switch to Korean'}
    >
      {locale === 'ko' ? '🇰🇷 KO' : '🇺🇸 EN'}
    </button>
  );
};
