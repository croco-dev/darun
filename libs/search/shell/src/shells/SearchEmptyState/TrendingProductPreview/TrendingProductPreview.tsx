'use client';

import { gql, useSuspenseQuery } from '@apollo/client';
import { useLocale } from 'next-intl';
import { ProductCard } from '@darun/products-shell';

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

type TrendingPreviewQueryResult = {
  rankedProducts: Array<{
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    summary?: string | null;
    voteCount: number;
    tags: Array<{ id: string; name: string }>;
  }>;
};

export const TrendingProductPreview = () => {
  const locale = useLocale();
  const { data } = useSuspenseQuery(TRENDING_PREVIEW_QUERY, {
    variables: { first: 8, locale },
  });

  const products = (data as unknown as TrendingPreviewQueryResult)?.rankedProducts ?? [];

  return (
    <div data-testid="trending-preview" className="px-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
        {products.slice(0, 6).map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            rank={index + 1}
            href={`/${locale}/products/${product.slug}`}
            source="search-empty"
          />
        ))}
      </div>
    </div>
  );
};