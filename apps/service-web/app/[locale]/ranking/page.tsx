import { RankingPage } from '@darun/pages-shell';
import { Metadata } from 'next';
import { getOgLocale, SITE_COPY } from '../../../lib/seo/metadata';
import { buildAlternates, normalizeLocale } from '../../../lib/seo/url';

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
      siteName: '다른(darun)',
      locale: getOgLocale(currentLocale),
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.rankingTitle,
      description: copy.rankingDescription,
    },
  };
}

export default RankingPage;
