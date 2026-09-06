import { SearchProductPage } from '@darun/pages-shell';
import { sanitizeQuery, TITLE_MAX_LENGTH } from '@darun/sanitize';
import { Metadata } from 'next';

import { NO_INDEX_ROBOTS } from '../../../../lib/seo/indexability';
import { SITE_COPY } from '../../../../lib/seo/metadata';
import { normalizeLocale } from '../../../../lib/seo/url';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const currentLocale = normalizeLocale(locale);
  const copy = SITE_COPY[currentLocale];
  const resolvedSearchParams = (await searchParams) ?? {};
  const rawQuery = resolvedSearchParams.query;
  const query = typeof rawQuery === 'string' ? rawQuery : Array.isArray(rawQuery) ? rawQuery[0] : undefined;

  const sanitizedQuery = query ? sanitizeQuery(query) : undefined;

  const title = sanitizedQuery
    ? (currentLocale === 'en'
        ? `${sanitizedQuery} Search Results - Darun`
        : `${sanitizedQuery} 검색 결과 - 다른`
      ).slice(0, TITLE_MAX_LENGTH)
    : copy.searchTitle;

  const description = sanitizedQuery
    ? currentLocale === 'en'
      ? `Search results for ${sanitizedQuery} on Darun.`
      : `${sanitizedQuery}와 관련된 서비스 검색 결과입니다.`
    : copy.searchDescription;

  return {
    title,
    description,
    robots: NO_INDEX_ROBOTS,
    openGraph: {
      title,
      description,
      siteName: '다른(darun)',
      type: 'website',
    },
  };
}

export default async function Page({ searchParams }: Props) {
  const resolvedSearchParams = (await searchParams) ?? {};

  return <SearchProductPage searchParams={resolvedSearchParams} />;
}
