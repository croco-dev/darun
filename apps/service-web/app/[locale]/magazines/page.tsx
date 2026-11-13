import { MagazineArticleGrid } from '@darun/magazines-shell';
import { ContentArea } from '@darun/ui';
import { Layout } from '@darun/ui-layout';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { graphql } from '../../../../../libs/__generated__/gql';
import { Link } from '../../../i18n/navigation';
import { NO_INDEX_ROBOTS } from '../../../lib/seo/indexability';
import { absolutePublicUrl, normalizeLocale } from '../../../lib/seo/url';
import { getClient } from '../../getServerClient';

const publishedMagazinesQuery = graphql(`
  query PublishedMagazinesForMagazineIndex {
    publishedMagazines {
      id
      slug
      title
      summary
      backgroundImageUrl
    }
  }
`);

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = normalizeLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Magazine.index' });

  return {
    title: t('title'),
    alternates: { canonical: absolutePublicUrl('ko', '/magazines') },
    robots: locale === 'en' ? NO_INDEX_ROBOTS : undefined,
  };
}

export default async function MagazineIndexPage({ params }: Props) {
  const locale = normalizeLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Magazine.index' });
  const { data } = await getClient({ static: true }).query({ query: publishedMagazinesQuery });
  if (!data) throw new Error('Missing published magazine list');

  return (
    <Layout>
      <ContentArea as="main" className="flex flex-col gap-6 py-8 sm:gap-8 sm:py-12">
        <h1 className="text-2xl font-extrabold tracking-tight text-dark-900 sm:text-3xl">{t('title')}</h1>
        {data.publishedMagazines.length > 0 ? (
          <MagazineArticleGrid articles={data.publishedMagazines} locale={locale} />
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-card-lg border border-dashed border-dark-200 bg-white px-6 py-12 text-center">
            <p className="text-base font-semibold text-dark-900">{t('empty')}</p>
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-semibold text-dark-700">
              <Link href="/" className="underline underline-offset-4">
                {t('home')}
              </Link>
              <Link href="/search/product" className="underline underline-offset-4">
                {t('search')}
              </Link>
            </div>
          </div>
        )}
      </ContentArea>
    </Layout>
  );
}
