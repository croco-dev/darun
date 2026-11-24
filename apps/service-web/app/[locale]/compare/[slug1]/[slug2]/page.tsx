import { gql } from '@apollo/client';
import { ProductCard, ProductVoteCount, getLocalizedTag } from '@darun/products-shell';
import { Breadcrumb, Chip, ContentArea, LogoImage, PageHeading } from '@darun/ui';
import { Layout } from '@darun/ui-layout';
import { notFound } from '@darun/utils-router';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { cache } from 'react';
import { NO_INDEX_ROBOTS } from '../../../../../lib/seo/indexability';
import { getOgLocale, getSiteName } from '../../../../../lib/seo/metadata';
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
  voteCount: number | null;
  tags: { id: string; name: string }[];
  ownedCompany?: { name: string };
};

type Props = {
  params: Promise<{ locale: string; slug1: string; slug2: string }>;
};

const getCompareProducts = cache(async (slug1: string, slug2: string, locale: string) => {
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
  const data = await getCompareProducts(resolvedParams.slug1, resolvedParams.slug2, currentLocale);

  const name1 = data?.product1?.name ?? resolvedParams.slug1;
  const name2 = data?.product2?.name ?? resolvedParams.slug2;

  const title = currentLocale === 'en' ? `${name1} vs ${name2} Comparison - Darun` : `${name1} vs ${name2} 비교 - 다른`;
  const description =
    currentLocale === 'en'
      ? `Compare ${name1} and ${name2} side-by-side on Darun.`
      : `${name1}와 ${name2}를 나란히 비교해보세요.`;

  const alternates = buildAlternates({
    locale: currentLocale,
    pathname: `/compare/${encodeURIComponent(resolvedParams.slug1)}/${encodeURIComponent(resolvedParams.slug2)}`,
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
      siteName: getSiteName(currentLocale),
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
  const data = await getCompareProducts(
    resolvedParams.slug1,
    resolvedParams.slug2,
    normalizeLocale(resolvedParams.locale)
  );

  if (!data?.product1 || !data?.product2) {
    return notFound();
  }

  const { product1, product2 } = data;
  const productColumns = [
    { id: 'compare-product-1', name: product1.name, logoUrl: product1.logoUrl },
    { id: 'compare-product-2', name: product2.name, logoUrl: product2.logoUrl },
  ] as const;
  const t = await getTranslations({
    locale: resolvedParams.locale,
    namespace: 'Compare',
  });
  const compareTitle = t('title', {
    name1: product1.name,
    name2: product2.name,
  });
  const isKo = resolvedParams.locale === 'ko';

  return (
    <Layout>
      <main className="flex min-h-[calc(100vh-4rem)] w-full flex-col bg-gradient-to-b from-surface-50/60 via-white to-white">
        <ContentArea className="flex flex-col gap-8 pt-5 pb-12 sm:pt-6 sm:pb-16 md:gap-12 md:pt-8 md:pb-20">
          <Breadcrumb
            data-testid="breadcrumb-compare"
            ariaLabel={resolvedParams.locale === 'ko' ? '탐색 경로' : 'Breadcrumb'}
            items={[
              {
                label: t('breadcrumb.home'),
                href: `/${resolvedParams.locale}`,
              },
              {
                label: t('breadcrumb.compare'),
                ariaCurrent: 'page',
              },
            ]}
          />
          <PageHeading
            title={t('title', { name1: product1.name, name2: product2.name })}
            subtitle={t('subtitle')}
            align="center"
          />

          <div
            role="region"
            aria-label={isKo ? `${compareTitle} - 서비스 카드` : `${compareTitle} - Service cards`}
            className="relative grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6"
          >
            <div data-testid="compare-column" className="h-full min-w-0">
              <ProductCard
                product={product1}
                href={`/${resolvedParams.locale}/products/${encodeURIComponent(product1.slug)}`}
                source="compare"
              />
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-full border border-dark-200 bg-white font-black text-3xs md:text-xs text-dark-700 shadow-md ring-4 ring-surface-50/60 select-none motion-reduce:transform-none"
            >
              VS
            </div>
            <div data-testid="compare-column" className="h-full min-w-0">
              <ProductCard
                product={product2}
                href={`/${resolvedParams.locale}/products/${encodeURIComponent(product2.slug)}`}
                source="compare"
              />
            </div>
          </div>

          <table
            role="table"
            aria-label={isKo ? `${compareTitle} - 상세 비교표` : `${compareTitle} - Detailed comparison`}
            className="block w-full overflow-hidden rounded-card-xl border border-dark-150 bg-white shadow-card"
          >
            {/* Keep explicit roles because the stacked layout overrides native table display. */}
            <thead
              role="rowgroup"
              className="block border-b border-dark-150/80 bg-surface-100/95 p-3.5 shadow-2xs sm:p-4 md:p-5"
            >
              <tr role="row" className="grid grid-cols-2">
                <td role="cell" className="sr-only" />
                {productColumns.map(({ id, name, logoUrl }) => (
                  <th
                    key={id}
                    id={id}
                    role="columnheader"
                    scope="col"
                    className="flex min-w-0 items-center gap-2 text-left nth-2:border-r nth-2:border-dark-150/80 nth-2:pr-3 last:pl-3 sm:gap-2.5 sm:nth-2:pr-4 sm:last:pl-4 md:nth-2:pr-5 md:last:pl-5"
                  >
                    {logoUrl ? (
                      <LogoImage
                        src={logoUrl}
                        fallbackSrc="/images/default-product-icon.svg"
                        alt=""
                        aria-hidden="true"
                        width={32}
                        height={32}
                        className="h-7 w-7 shrink-0 rounded-lg border border-dark-150/90 bg-white object-contain p-0.5 shadow-2xs ring-1 ring-black/5 sm:h-8 sm:w-8"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-dark-150 bg-surface-200 text-xs font-bold text-dark-600 shadow-2xs ring-1 ring-black/5 sm:h-8 sm:w-8"
                      >
                        {name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="truncate text-xs font-extrabold text-dark-900 sm:text-sm">{name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody role="rowgroup" className="block">
              <CompareRow
                field="name"
                label={t('table.name')}
                columns={productColumns}
                values={[product1.name, product2.name]}
              />
              <CompareRow
                field="summary"
                label={t('table.summary')}
                columns={productColumns}
                values={[product1.summary, product2.summary]}
              />
              <CompareRow
                field="company"
                label={t('table.company')}
                columns={productColumns}
                values={[product1.ownedCompany?.name, product2.ownedCompany?.name]}
              />
              <CompareRow
                field="vote-count"
                label={t('table.voteCount')}
                columns={productColumns}
                values={[
                  <ProductVoteCount slug={product1.slug} count={product1.voteCount} />,
                  <ProductVoteCount slug={product2.slug} count={product2.voteCount} />,
                ]}
              />
              <CompareRow
                field="tags"
                label={t('table.tags')}
                columns={productColumns}
                values={[
                  renderTags(product1.tags, resolvedParams.locale),
                  renderTags(product2.tags, resolvedParams.locale),
                ]}
              />
            </tbody>
          </table>
        </ContentArea>
      </main>
    </Layout>
  );
}

function CompareRow({
  field,
  label,
  columns,
  values,
}: {
  field: string;
  label: string;
  columns: readonly { id: string; name: string }[];
  values: readonly [React.ReactNode, React.ReactNode];
}) {
  const rowHeaderId = `compare-field-${field}`;
  return (
    <tr
      role="row"
      className="grid grid-cols-1 gap-y-2 border-b border-dark-150/70 p-4 transition-colors duration-150 last:border-b-0 hover:bg-surface-50/60 md:grid-cols-2 md:p-5"
    >
      <th
        id={rowHeaderId}
        role="rowheader"
        scope="row"
        className="break-words text-left text-xs font-bold tracking-tight text-dark-500 [word-break:keep-all] md:col-span-2"
      >
        {label}
      </th>
      {columns.map(({ id, name }, index) => (
        <td
          key={id}
          role="cell"
          headers={`${rowHeaderId} ${id}`}
          className="min-w-0 nth-2:md:border-r nth-2:md:border-dark-150/70 nth-2:md:pr-5 last:mt-1 last:border-t last:border-dark-100/70 last:pt-2.5 md:last:mt-0 md:last:border-t-0 md:last:pt-0 md:last:pl-5"
        >
          <span
            aria-hidden="true"
            className="mb-1.5 block w-fit max-w-full truncate rounded-md border border-dark-150/70 bg-surface-100/90 px-2 py-0.5 text-2xs font-semibold text-dark-600 shadow-2xs select-none md:hidden"
          >
            {name}
          </span>
          <div
            className="text-sm leading-relaxed text-dark-800 [overflow-wrap:anywhere] [word-break:keep-all]"
            data-testid={`compare-row-${field}-${index + 1}`}
          >
            {values[index] || <span className="text-dark-400 font-mono">-</span>}
          </div>
        </td>
      ))}
    </tr>
  );
}

function renderTags(tags: ProductData['tags'] | undefined, locale: string) {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map(tag => (
        <Chip key={tag.id} color="filledGray" variant="square">
          {getLocalizedTag(tag.name, locale)}
        </Chip>
      ))}
    </div>
  );
}
