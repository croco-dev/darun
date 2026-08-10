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
      className="cursor-pointer rounded-lg border border-dark-200 bg-white px-3 py-1.5 text-sm font-semibold text-dark-900 transition-colors duration-200 hover:bg-surface-100"
    >
      {locale === 'ko' ? '🇰🇷 KO' : '🇺🇸 EN'}
    </button>
  );
};
