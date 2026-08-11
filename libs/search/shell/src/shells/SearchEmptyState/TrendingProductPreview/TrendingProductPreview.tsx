'use client';

import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { AnalyticsEvents, track } from '@darun/analytics-client';
import { ProductCard } from '@darun/products-shell';
import { TrendingPreviewDocument } from '@darun/provider-graphql';
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
