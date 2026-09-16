import { RankingPage as RankingPageContent } from '@darun/pages-shell';
import { Metadata } from 'next';
import { JsonLd } from '../../../lib/seo/json-ld';
import { getOgLocale, getSiteName, SITE_COPY } from '../../../lib/seo/metadata';
import { absolutePublicUrl, buildAlternates, normalizeLocale } from '../../../lib/seo/url';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const currentLocale = normalizeLocale(locale);
  const copy = SITE_COPY[currentLocale];
  const alternates = buildAlternates({
    locale: currentLocale,
    pathname: '/ranking',
    includeMarkdownAlternate: true,
  });

  return {
    title: copy.rankingTitle,
    description: copy.rankingDescription,
    alternates,
    openGraph: {
      title: copy.rankingTitle,
      description: copy.rankingDescription,
      url: alternates.canonical,
      siteName: getSiteName(currentLocale),
      locale: getOgLocale(currentLocale),
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.rankingTitle,
      description: copy.rankingDescription,
    },
  };
}

export default async function RankingPage({ params }: Props) {
  const { locale } = await params;
  const currentLocale = normalizeLocale(locale);
  const copy = SITE_COPY[currentLocale];
  const canonicalUrl = absolutePublicUrl(currentLocale, '/ranking');

  const breadcrumbList = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: currentLocale === 'en' ? 'Home' : '홈',
        item: absolutePublicUrl(currentLocale, '/'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: currentLocale === 'en' ? 'Ranking' : '인기 랭킹',
        item: canonicalUrl,
      },
    ],
  };

  const collectionPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: copy.rankingTitle,
    description: copy.rankingDescription,
    url: canonicalUrl,
  };

  return (
    <>
      <JsonLd data={breadcrumbList} />
      <JsonLd data={collectionPageJsonLd} />
      <RankingPageContent />
    </>
  );
}
