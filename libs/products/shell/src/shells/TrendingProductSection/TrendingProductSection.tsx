'use client';

import { gql, useSuspenseQuery } from '@apollo/client';
import { bind } from '@croco/utils-structure-react';
import { Link } from '@darun/utils-router';
import { useLocale, useTranslations } from 'next-intl';
import { SectionHeader } from '../../../../../shared/ui/src/components/SectionHeader';
import { SectionWrapper } from '../../../../../shared/ui/src/components/SectionWrapper';
import { ProductItem } from '../../uis';

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
  const { data } = useSuspenseQuery<TrendingProductsQueryData>(
    TRENDING_PRODUCTS_QUERY,
    {
      variables: {
        locale,
      },
    },
  );

  return {
    products: data?.rankedProducts ?? [],
    title: t('trending.title'),
    moreLabel: t('trending.more'),
    emptyLabel: t('trending.empty'),
  };
}

const TrendingProductsView = ({
  products,
  title,
  moreLabel,
  emptyLabel,
}: TrendingProductsViewProps) => {
  return (
    <SectionWrapper background="white" spacing="md">
      <div className="flex flex-col gap-6">
        <SectionHeader
          title={title}
          moreLink={
            <Link
              href="/ranking"
              className="text-sm font-semibold text-brand-700 transition-colors hover:text-brand-800"
            >
              {moreLabel}
            </Link>
          }
        />
        {products.length === 0 ? (
          <div className="flex min-h-40 items-center justify-center rounded-[24px] border border-surface-300 bg-surface-100 px-6 py-10 text-center text-sm font-medium text-dark-600 sm:text-base">
            {emptyLabel}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product, index) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="group h-full"
              >
                <div className="relative flex h-full flex-col rounded-[24px] border border-surface-300 bg-white p-4 transition-colors group-hover:border-brand-300">
                  <span className="absolute left-4 top-4 inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-brand-100 px-3 text-sm font-bold text-brand-700">
                    {index + 1}
                  </span>
                  <div className="pt-12">
                    <ProductItem
                      name={product.name}
                      logoUrl={product.logoUrl ?? undefined}
                      logoSize="medium"
                      summary={product.summary ?? undefined}
                      tags={product.tags.map((tag) => tag.name)}
                      maxTagItems={2}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </SectionWrapper>
  );
};

export const TrendingProductSection = bind(
  useTrendingProducts,
  TrendingProductsView,
);
