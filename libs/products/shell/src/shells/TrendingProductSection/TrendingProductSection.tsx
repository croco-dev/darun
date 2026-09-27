'use client';

import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { AnalyticsEvents, track } from '@darun/analytics-client';
import { ChevronRight, SectionHeader, SectionWrapper, TrendingUp } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { useLocale, useTranslations } from 'next-intl';
import { ProductCard } from '../../components/ProductCard';

const TRENDING_PRODUCTS_QUERY = gql`
  query TrendingProductsOnTrendingProductSection($locale: String!) {
    rankedProducts(first: 8, locale: $locale) {
      id
      name
      slug
      logoUrl
      summary
      voteCount
      tags {
        id
        name
      }
    }
  }
`;

type TrendingProduct = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  summary?: string | null;
  voteCount: number;
  tags: Array<{
    id: string;
    name: string;
  }>;
};

type TrendingProductsQueryData = {
  rankedProducts?: TrendingProduct[] | null;
};

type TrendingProductsViewProps = {
  products: TrendingProduct[];
  title: string;
  subtitle: string;
  moreLabel: string;
  emptyLabel: string;
  rankingMoreHref: string;
  locale: string;
};

function useTrendingProducts(): TrendingProductsViewProps {
  const locale = useLocale();
  const t = useTranslations('home');
  const { data } = useSuspenseQuery<TrendingProductsQueryData>(TRENDING_PRODUCTS_QUERY, {
    variables: {
      locale,
    },
  });

  return {
    products: data?.rankedProducts ?? [],
    title: t('trending.title'),
    subtitle: t('trending.description'),
    moreLabel: t('trending.more'),
    emptyLabel: t('trending.empty'),
    rankingMoreHref: `/${locale}/ranking`,
    locale,
  };
}

const TrendingProductsView = ({
  products,
  title,
  subtitle,
  moreLabel,
  emptyLabel,
  rankingMoreHref,
  locale,
}: TrendingProductsViewProps) => {
  return (
    <SectionWrapper background="white" spacing="md" className="border-t border-dark-100/70">
      <div className="flex flex-col gap-5 md:gap-6">
        <SectionHeader
          title={title}
          subtitle={subtitle}
          moreLink={
            <Link
              href={rankingMoreHref}
              className="group inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-dark-700 transition-colors duration-200 ease-out hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/70 motion-reduce:transition-none"
            >
              <span>{moreLabel}</span>
              <ChevronRight
                size={16}
                aria-hidden="true"
                className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
              />
            </Link>
          }
        />
        {products.length === 0 ? (
          <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-dark-200/80 bg-surface-50/50 px-6 py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-dark-150 bg-surface-100 text-dark-500 shadow-2xs">
              <TrendingUp size={22} className="stroke-[2]" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-dark-900 break-keep">{emptyLabel}</p>
          </div>
        ) : (
          <div
            role="group"
            aria-label={title}
            className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-5"
          >
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                rank={index + 1}
                href={`/${locale}/products/${product.slug}?from=trending`}
                source="trending"
                onClick={() =>
                  track(AnalyticsEvents.RANKED_PRODUCT_CLICKED, {
                    productSlug: product.slug,
                    source: 'trending',
                  })
                }
              />
            ))}
          </div>
        )}
      </div>
    </SectionWrapper>
  );
};

export const TrendingProductSection = bind(useTrendingProducts, TrendingProductsView);
