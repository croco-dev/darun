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
      <div className="flex flex-col gap-6">
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
          <div className="flex min-h-40 items-center justify-center rounded-[24px] border border-surface-300 bg-surface-100 px-6 py-10 text-center text-sm font-medium text-dark-600 sm:text-base">
            {emptyLabel}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {products.map((product, index) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="group h-full focus-visible:outline-none"
              >
                <div className="relative flex h-full flex-col rounded-[20px] border border-surface-300 bg-white p-3.5 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.18)] transition-all duration-200 ease-out group-hover:-translate-y-1 group-hover:border-brand-300 group-hover:shadow-[0_22px_40px_-26px_rgba(53,63,174,0.28)] group-focus-visible:-translate-y-1 group-focus-visible:border-brand-300 group-focus-visible:shadow-[0_22px_40px_-26px_rgba(53,63,174,0.28)] group-focus-visible:ring-2 group-focus-visible:ring-brand-300/70 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-white active:translate-y-0 active:scale-[0.99] motion-reduce:transform-none motion-reduce:transition-none md:rounded-[24px] md:p-4">
                  <span className="absolute left-3.5 top-3.5 inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-brand-100 px-2.5 text-xs font-bold text-brand-700 transition-transform duration-200 ease-out group-hover:scale-105 group-focus-visible:scale-105 motion-reduce:transform-none motion-reduce:transition-none md:left-4 md:top-4 md:h-9 md:min-w-9 md:px-3 md:text-sm">
                    {index + 1}
                  </span>
                  <div className="pt-10 transition-transform duration-200 ease-out group-hover:translate-y-0.5 group-focus-visible:translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none [&>div>div:last-child>div:last-child]:transition-transform [&>div>div:last-child>div:last-child]:duration-200 [&>div>div:last-child>div:last-child]:ease-out group-hover:[&>div>div:last-child>div:last-child]:translate-x-0.5 group-focus-visible:[&>div>div:last-child>div:last-child]:translate-x-0.5 motion-reduce:[&>div>div:last-child>div:last-child]:transform-none motion-reduce:[&>div>div:last-child>div:last-child]:transition-none md:pt-12">
                    <ProductItem
                      name={product.name}
                      logoUrl={product.logoUrl ?? undefined}
                      logoSize="small"
                      summary={product.summary ?? undefined}
                      tags={product.tags.map(tag => tag.name)}
                      maxTagItems={1}
                      isSummaryNoWrap
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

export const TrendingProductSection = bind(useTrendingProducts, TrendingProductsView);
