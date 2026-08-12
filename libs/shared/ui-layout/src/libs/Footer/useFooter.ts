'use client';

import { useLocale } from 'next-intl';

export function useFooter() {
  const locale = useLocale() || 'ko';
  return {
    privacyUrl: `/${locale}/privacy`,
    termsUrl: `/${locale}/terms`,
  };
}
