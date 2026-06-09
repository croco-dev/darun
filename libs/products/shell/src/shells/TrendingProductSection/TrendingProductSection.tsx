'use client';

import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { bind } from '@croco/utils-structure-react';
import { SectionHeader, SectionWrapper } from '@darun/ui';
import { Link } from '@darun/utils-router';
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
  moreLabel: string;
  emptyLabel: string;
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
    moreLabel: t('trending.more'),
    emptyLabel: t('trending.empty'),
  };
}

const TrendingProductsView = ({ products, title, moreLabel, emptyLabel }: TrendingProductsViewProps) => {
  return (
    <SectionWrapper background="white" spacing="md" className="home-motion">
      <div className="flex flex-col gap-5 md:gap-6">
        <SectionHeader
          title={title}
          moreLink={
            <Link
              href="/ranking"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 transition-colors duration-200 ease-out hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-reduce:transition-none"
            >
              {moreLabel}
            </Link>
          }
        />
        {products.length === 0 ? (
          <div className="flex min-h-40 items-center justify-center rounded-card-lg border border-surface-300 bg-surface-100 px-6 py-10 text-center text-sm font-medium text-dark-600 sm:text-base">
            {emptyLabel}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                rank={index + 1}
                href={`/products/${product.slug}?from=trending`}
                source="trending"
              />
            ))}
          </div>
        )}
      </div>
    </SectionWrapper>
  );
};

export const TrendingProductSection = bind(useTrendingProducts, TrendingProductsView);
