'use client';

import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { AnalyticsEvents, track } from '@darun/analytics-client';
import { ProductCard } from '@darun/products-shell';
import { TrendingPreviewDocument } from '@darun/provider-graphql';
import { TrendingUp } from '@darun/ui';
import { useLocale } from 'next-intl';

const TRENDING_PREVIEW_QUERY = gql`
  query TrendingPreview($first: Int!, $locale: String!) {
    rankedProducts(first: $first, locale: $locale) {
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

export const TrendingProductPreview = () => {
  const locale = useLocale();
  const { data } = useSuspenseQuery(TrendingPreviewDocument, {
    variables: { first: 8, locale },
  });

  const products = data?.rankedProducts ?? [];

  if (products.length === 0) {
    return (
      <div data-testid="trending-preview">
        <div className="flex min-h-36 flex-col items-center justify-center rounded-card-lg border border-dark-150 bg-white px-6 py-8 text-center shadow-card">
          <div className="mb-2.5 flex h-11 w-11 items-center justify-center rounded-2xl border border-dark-150 bg-surface-100 text-dark-400 shadow-2xs">
            <TrendingUp size={20} className="stroke-[2]" />
          </div>
          <p className="text-sm font-semibold text-dark-900 break-keep">
            {locale === 'ko' ? '집계된 인기 서비스가 없습니다' : 'No trending software found'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="trending-preview">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:gap-5">
        {products.slice(0, 6).map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            rank={index + 1}
            href={`/${locale}/products/${product.slug}?from=trending`}
            source="search-empty"
            onClick={() =>
              track(AnalyticsEvents.RANKED_PRODUCT_CLICKED, {
                productSlug: product.slug,
                source: 'search-empty-trending',
              })
            }
          />
        ))}
      </div>
    </div>
  );
};
