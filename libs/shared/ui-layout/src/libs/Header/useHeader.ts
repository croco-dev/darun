import { usePathname } from '@darun/utils-router';
import { routing } from '../../i18n/routing';

type Locale = (typeof routing.locales)[number];

function isLocale(segment: string): segment is Locale {
  return routing.locales.some(locale => locale === segment);
}

function withLocale(pathname: string | null, target: string): string {
  if (!pathname) {
    return target;
  }

  const localeSegment = pathname.split('/').filter(Boolean)[0];

  if (!localeSegment || !isLocale(localeSegment)) {
    return target;
  }

  if (target === '/') {
    return `/${localeSegment}`;
  }

  return `/${localeSegment}${target}`;
}

export function useHeader() {
  const pathname = usePathname();

  return {
    headerUrl: withLocale(pathname, '/'),
    rankingUrl: withLocale(pathname, '/ranking'),
    browseUrl: withLocale(pathname, '/search/product'),
  };
}
