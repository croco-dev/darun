import { gql } from '@apollo/client';
import { ProductCard } from '@darun/products-shell';
import { Chip, ContentArea, PageHeading } from '@darun/ui';
import { Layout } from '@darun/ui-layout';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { NO_INDEX_ROBOTS } from '../../../../../lib/seo/indexability';
import { getOgLocale } from '../../../../../lib/seo/metadata';
import { buildAlternates, normalizeLocale } from '../../../../../lib/seo/url';
import { getClient } from '../../../../getServerClient';

const productsQuery = gql`
  query ProductsForCompare($slug1: String!, $slug2: String!, $locale: String!) {
    product1: productBySlug(slug: $slug1, locale: $locale) {
      id
      name
      slug
      summary
      logoUrl
      voteCount
      tags {
        id
        name
      }
      ownedCompany {
        name
      }
    }
    product2: productBySlug(slug: $slug2, locale: $locale) {
      id
      name
      slug
      summary
      logoUrl
      voteCount
      tags {
        id
        name
      }
      ownedCompany {
        name
      }
    }
  }
`;

type ProductData = {
  id: string;
  name: string;
  slug: string;
  summary?: string | null;
  logoUrl?: string | null;
  voteCount: number;
  tags: { id: string; name: string }[];
  ownedCompany?: { name: string };
};

type Props = {
  params: Promise<{ locale: string; slug1: string; slug2: string }>;
};

const getCompareProducts = cache(async ({ slug1, slug2, locale }: Awaited<Props['params']>) => {
  const { data } = await getClient().query<{
    product1?: ProductData;
    product2?: ProductData;
  }>({
    query: productsQuery,
    variables: { slug1, slug2, locale },
  });
  return data;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const currentLocale = normalizeLocale(resolvedParams.locale);
  const data = await getCompareProducts({
    slug1: resolvedParams.slug1,
    slug2: resolvedParams.slug2,
    locale: currentLocale,
  });

  const name1 = data?.product1?.name ?? resolvedParams.slug1;
  const name2 = data?.product2?.name ?? resolvedParams.slug2;

  const title = currentLocale === 'en' ? `${name1} vs ${name2} Comparison - Darun` : `${name1} vs ${name2} 비교 - 다른`;
  const description =
    currentLocale === 'en'
      ? `Compare ${name1} and ${name2} side-by-side on Darun.`
      : `${name1}와 ${name2}를 나란히 비교해보세요.`;

  const alternates = buildAlternates({
    locale: currentLocale,
    pathname: `/compare/${resolvedParams.slug1}/${resolvedParams.slug2}`,
    includeMarkdownAlternate: true,
  });

  return {
    title,
    description,
    alternates,
    robots: NO_INDEX_ROBOTS,
    openGraph: {
      title,
      description,
      url: alternates.canonical,
      siteName: '다른(darun)',
      locale: getOgLocale(currentLocale),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function ComparePage({ params }: Props) {
  const resolvedParams = await params;
  const data = await getCompareProducts(resolvedParams);

  if (!data?.product1 || !data.product2) {
    return notFound();
  }

  const { product1, product2 } = data;
  const isKo = resolvedParams.locale === 'ko';

  return (
    <Layout>
      <main className="flex w-full flex-col">
        <ContentArea className="flex flex-col gap-8 py-6 md:gap-12 md:py-8">
          <PageHeading
            title={
              resolvedParams.locale === 'en'
                ? `${product1.name} vs ${product2.name} Comparison`
                : `${product1.name} vs ${product2.name} 비교`
            }
            subtitle={
              resolvedParams.locale === 'en'
                ? 'Compare features and details side-by-side'
                : '두 서비스의 핵심 정보를 나란히 확인해보세요'
            }
            align="center"
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
            <div data-testid="compare-column">
              <ProductCard
                product={product1}
                href={`/${resolvedParams.locale}/products/${product1.slug}`}
                source="compare"
              />
            </div>
            <div data-testid="compare-column">
              <ProductCard
                product={product2}
                href={`/${resolvedParams.locale}/products/${product2.slug}`}
                source="compare"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-card-xl border border-dark-150 bg-white shadow-card">
            <div className="hidden border-b border-dark-150 bg-surface-100 p-4 md:grid md:grid-cols-2 md:divide-x md:divide-dark-150 md:p-5">
              <div className="pr-4 md:pr-5">
                <span className="text-sm font-bold text-dark-900">{product1.name}</span>
              </div>
              <div className="pl-4 md:pl-5">
                <span className="text-sm font-bold text-dark-900">{product2.name}</span>
              </div>
            </div>
            <CompareRow
              label={isKo ? '서비스명' : 'Service Name'}
              colLabel1={product1.name}
              colLabel2={product2.name}
              value1={product1.name}
              value2={product2.name}
              testid="name"
            />
            <CompareRow
              label={isKo ? '설명' : 'Overview'}
              colLabel1={product1.name}
              colLabel2={product2.name}
              value1={product1.summary ?? undefined}
              value2={product2.summary ?? undefined}
              testid="summary"
            />
            <CompareRow
              label={isKo ? '회사' : 'Company'}
              colLabel1={product1.name}
              colLabel2={product2.name}
              value1={product1.ownedCompany?.name}
              value2={product2.ownedCompany?.name}
              testid="company"
            />
            <CompareRow
              label={isKo ? '투표 수' : 'Votes'}
              colLabel1={product1.name}
              colLabel2={product2.name}
              value1={product1.voteCount.toLocaleString(resolvedParams.locale)}
              value2={product2.voteCount.toLocaleString(resolvedParams.locale)}
              testid="vote-count"
            />
            <CompareRow
              label={isKo ? '태그' : 'Tags'}
              colLabel1={product1.name}
              colLabel2={product2.name}
              value1={product1.tags.map(t => t.name).join(', ')}
              value2={product2.tags.map(t => t.name).join(', ')}
              tags1={product1.tags.map(t => t.name)}
              tags2={product2.tags.map(t => t.name)}
              testid="tags"
              isLast
            />
          </div>
        </ContentArea>
      </main>
    </Layout>
  );
}

function CompareRow({
  label,
  colLabel1,
  colLabel2,
  value1,
  value2,
  tags1,
  tags2,
  testid,
  isLast,
}: {
  label: string;
  colLabel1: string;
  colLabel2: string;
  value1?: string;
  value2?: string;
  tags1?: string[];
  tags2?: string[];
  testid: string;
  isLast?: boolean;
}) {
  return (
    <div className={`p-4 md:p-5 ${isLast ? '' : 'border-b border-dark-100'}`}>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-dark-500">{label}</div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-0 md:divide-x md:divide-dark-100">
        <div className="md:pr-5">
          <div className="mb-1 text-xs font-medium text-dark-500 md:hidden">{colLabel1}</div>
          <div className="text-sm leading-relaxed text-dark-800" data-testid={`compare-row-${testid}-1`}>
            {tags1 && tags1.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {tags1.map(tag => (
                  <Chip key={tag} color="outlineGray" variant="circle">
                    {tag}
                  </Chip>
                ))}
              </div>
            ) : (
              value1 || '-'
            )}
          </div>
        </div>
        <div className="md:pl-5">
          <div className="mb-1 text-xs font-medium text-dark-500 md:hidden">{colLabel2}</div>
          <div className="text-sm leading-relaxed text-dark-800" data-testid={`compare-row-${testid}-2`}>
            {tags2 && tags2.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {tags2.map(tag => (
                  <Chip key={tag} color="outlineGray" variant="circle">
                    {tag}
                  </Chip>
                ))}
              </div>
            ) : (
              value2 || '-'
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
