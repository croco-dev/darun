export const PUBLIC_ORIGIN = 'https://www.darun.io';

export type PublicLocale = 'ko' | 'en';

export const DEFAULT_LOCALE: PublicLocale = 'ko';
export const SUPPORTED_LOCALES: readonly PublicLocale[] = ['ko', 'en'] as const;

export function isPublicLocale(locale: string): locale is PublicLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}

export function normalizeLocale(locale: string): PublicLocale {
  return locale === 'en' ? 'en' : 'ko';
}

export function cleanPathname(pathname: string): string {
  // Strip query string and hash if accidentally provided
  let path = pathname.split('?')[0]?.split('#')[0] ?? '';

  // Remove duplicate slashes
  path = path.replace(/\/+/g, '/');

  // Strip leading locale prefix if already present
  for (const loc of SUPPORTED_LOCALES) {
    if (path === `/${loc}` || path === loc || path === `/${loc}/`) {
      path = '';
      break;
    }
    if (path.startsWith(`/${loc}/`)) {
      path = path.slice(loc.length + 1);
      break;
    }
    if (path.startsWith(`${loc}/`)) {
      path = path.slice(loc.length);
      break;
    }
  }

  // Ensure leading slash if not empty
  if (path && !path.startsWith('/')) {
    path = `/${path}`;
  }

  // Strip trailing slash unless root path
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }

  return path;
}

export function publicPath(locale: PublicLocale, pathname: string): string {
  const clean = cleanPathname(pathname);
  if (!clean || clean === '/') {
    return `/${locale}`;
  }
  return `/${locale}${clean}`;
}

export function absolutePublicUrl(locale: PublicLocale, pathname: string): string {
  return `${PUBLIC_ORIGIN}${publicPath(locale, pathname)}`;
}

export function markdownSiblingUrl(locale: PublicLocale, pathname: string): string {
  return `${absolutePublicUrl(locale, pathname)}.md`;
}

export type AlternatesOptions = {
  locale: PublicLocale;
  pathname: string;
  includeMarkdownAlternate?: boolean;
};

export function buildAlternates({ locale, pathname, includeMarkdownAlternate = false }: AlternatesOptions) {
  const canonical = absolutePublicUrl(locale, pathname);
  const languages: Record<string, string> = {};

  for (const loc of SUPPORTED_LOCALES) {
    languages[loc] = absolutePublicUrl(loc, pathname);
  }
  languages['x-default'] = absolutePublicUrl(DEFAULT_LOCALE, pathname);

  const alternates: {
    canonical: string;
    languages: Record<string, string>;
    types?: Record<string, string>;
  } = {
    canonical,
    languages,
  };

  if (includeMarkdownAlternate) {
    alternates.types = {
      'text/markdown': markdownSiblingUrl(locale, pathname),
    };
  }

  return alternates;
}
