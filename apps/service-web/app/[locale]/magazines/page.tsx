import { MagazineArticleGrid } from '@darun/magazines-shell';
import { ContentArea } from '@darun/ui';
import { Layout } from '@darun/ui-layout';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { graphql } from '../../../../../libs/__generated__/gql';
import { Link } from '../../../i18n/navigation';
import { NO_INDEX_ROBOTS } from '../../../lib/seo/indexability';
import {
  absolutePublicUrl,
  magazineArticlePath,
  markdownSiblingUrl,
  normalizeLocale,
  publicPath,
} from '../../../lib/seo/url';
import { getClient } from '../../getServerClient';

const publishedMagazinesQuery = graphql(`
  query PublishedMagazinesForMagazineIndex($first: Int!, $after: String) {
    publishedMagazines(first: $first, after: $after) {
      edges {
        node {
          id
          slug
          title
          summary
          backgroundImageUrl
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`);

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ after?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = normalizeLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Magazine.index' });

  return {
    title: t('title'),
    alternates: {
      canonical: absolutePublicUrl('ko', '/magazines'),
      types: { 'text/markdown': markdownSiblingUrl(locale, '/magazines') },
    },
    robots: locale === 'en' ? NO_INDEX_ROBOTS : undefined,
  };
}

export default async function MagazineIndexPage({ params, searchParams }: Props) {
  const locale = normalizeLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Magazine.index' });
  const after = (await searchParams)?.after;
  if (Array.isArray(after)) throw new Error('Invalid magazine cursor');
  const { data } = await getClient({ static: true }).query({
    query: publishedMagazinesQuery,
    variables: { first: 24, after },
  });
  if (!data) throw new Error('Missing published magazine list');

  const { edges, pageInfo } = data.publishedMagazines;
  if (pageInfo.hasNextPage && !pageInfo.endCursor) throw new Error('Missing magazine cursor');

  return (
    <Layout>
      <ContentArea as="main" className="flex flex-col gap-6 py-8 sm:gap-8 sm:py-12">
        <h1 className="text-2xl font-extrabold tracking-tight text-dark-900 sm:text-3xl">{t('title')}</h1>
        {edges.length > 0 ? (
          <MagazineArticleGrid
            articles={edges.map(({ node: { slug, ...article } }) => ({
              ...article,
              href: publicPath(locale, magazineArticlePath(slug)),
            }))}
          />
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-card-lg border border-dashed border-dark-200 bg-white px-6 py-12 text-center">
            <p className="text-base font-semibold text-dark-900">{t(after ? 'emptyPage' : 'empty')}</p>
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
        {(after || pageInfo.hasNextPage) && (
          <nav
            aria-label={t('pagination')}
            className="flex flex-wrap items-center justify-between gap-4 text-sm font-semibold"
          >
            {after && (
              <Link href="/magazines" className="underline underline-offset-4">
                {t('latest')}
              </Link>
            )}
            {pageInfo.hasNextPage && (
              <Link
                href={{
                  pathname: '/magazines',
                  query: { after: pageInfo.endCursor! },
                }}
                className="underline underline-offset-4"
              >
                {t('next')}
              </Link>
            )}
          </nav>
        )}
      </ContentArea>
    </Layout>
  );
}
