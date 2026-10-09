'use client';

import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { AnalyticsEvents, track } from '@darun/analytics-client';
import { ProductCard } from '@darun/products-shell';
import { TrendingUp } from '@darun/ui';
import { useLocale, useTranslations } from 'next-intl';

const TRENDING_PREVIEW = gql`
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

type TrendingPreviewProduct = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  summary: string;
  voteCount: number;
  tags: Array<{ id: string; name: string }>;
};

export const TrendingProductPreview = () => {
  const locale = useLocale();
  const t = useTranslations('Search');
  const { data } = useSuspenseQuery<{ rankedProducts?: Array<TrendingPreviewProduct> }>(TRENDING_PREVIEW, {
    variables: { first: 8, locale },
  });

  const products = (data?.rankedProducts ?? []).slice(0, 8);

  if (products.length === 0) {
    return (
      <div data-testid="trending-preview">
        <div className="flex min-h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-dark-200/80 bg-surface-50/50 px-6 py-10 text-center">
          <div className="mb-2.5 flex h-11 w-11 items-center justify-center rounded-2xl border border-dark-150 bg-surface-100 text-dark-500 shadow-2xs">
            <TrendingUp size={20} className="shrink-0 stroke-[2]" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-dark-900 break-words [word-break:keep-all]">
            {t('page.trendingEmpty')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="trending-preview">
      <div
        role="group"
        aria-label={t('page.trendingTitle')}
        className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:gap-5"
      >
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            rank={index + 1}
            href={`/${locale}/products/${encodeURIComponent(product.slug)}?from=trending`}
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
