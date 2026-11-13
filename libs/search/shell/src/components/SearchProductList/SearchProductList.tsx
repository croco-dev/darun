'use client';

import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { AnalyticsEvents, track } from '@darun/analytics-client';
import { ProductCard, getCategoryIcon } from '@darun/products-shell';
import {
  CompactCategoriesForSearchProductListDocument,
  CompactTrendingPreviewForSearchProductListDocument,
} from '@darun/provider-graphql';
import { Button, Search } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { useLocale, useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';
import { SearchProduct, useSearchProductList } from './useSearchProductList';

const POPULAR_QUERIES: Record<string, string[]> = {
  ko: ['프로덕트헌트', '노션', '피그마'],
  en: ['Product Hunt', 'Notion', 'Figma'],
};

function trackShortcutActivation(trackClick: () => void) {
  return {
    onClick: trackClick,
    onAuxClick: (event: MouseEvent<HTMLAnchorElement>) => {
      if (event.button === 1) trackClick();
    },
  };
}

const CATEGORIES_QUERY = gql`
  query CompactCategoriesForSearchProductList($first: Int!, $locale: String!) {
    categories(first: $first, locale: $locale) {
      id
      slug
      labelKo
      labelEn
    }
  }
`;

const TRENDING_PREVIEW_QUERY = gql`
  query CompactTrendingPreviewForSearchProductList($first: Int!, $locale: String!) {
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

type SearchProductListViewProps = {
  products: SearchProduct[];
  query: string;
};

export const SearchProductList = bind(useSearchProductList, ({ products, query }: SearchProductListViewProps) => {
  const t = useTranslations('Search');
  const locale = useLocale();

  if (products.length === 0) return <EmptySearchResults query={query} />;
  return (
    <div className="flex flex-col gap-4">
      <span role="status" aria-live="polite" className="text-sm text-dark-700">
        {t('list.resultCount', { count: products.length })}
      </span>
      <div
        role="group"
        aria-label={t('page.resultTitle', { query })}
        className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-5"
      >
        {products.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            href={`/${locale}/products/${encodeURIComponent(product.slug)}?from=search`}
            source="search"
          />
        ))}
      </div>
    </div>
  );
});

function EmptySearchResults({ query }: { query: string }) {
  const t = useTranslations('Search');
  const locale = useLocale();
  const popularQueries = POPULAR_QUERIES[locale] ?? POPULAR_QUERIES.ko;
  const categoriesQuery = useQuery(CompactCategoriesForSearchProductListDocument, {
    variables: { first: 4, locale },
  });
  const trendingQuery = useQuery(CompactTrendingPreviewForSearchProductListDocument, {
    variables: { first: 3, locale },
  });

  const categories = categoriesQuery.data?.categories ?? [];
  const trendingProducts = trendingQuery.data?.rankedProducts ?? [];

  const getNoResultsMessage = () => {
    try {
      return t('list.empty.noResults', { query });
    } catch {
      return t('list.empty.title');
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-dark-150 bg-surface-100 text-dark-700 shadow-2xs">
          <Search size={22} className="shrink-0 stroke-[2]" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-xl font-bold leading-tight text-dark-900 break-words [word-break:keep-all] sm:text-2xl">
            {getNoResultsMessage()}
          </p>
          <p className="text-sm text-dark-600 break-words [word-break:keep-all] sm:text-base">
            {t('list.empty.description')}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-dark-900 break-words [word-break:keep-all]">
            {t('list.empty.popularQueries')}
          </p>
          <div
            data-testid="search-empty-popular-queries"
            tabIndex={0}
            className="flex gap-2 overflow-x-auto px-1 py-1.5 scrollbar-hide scroll-smooth scroll-pl-1 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
            role="group"
            aria-label={t('list.empty.popularQueries')}
          >
            {popularQueries.map(popularQuery => (
              <Link
                key={popularQuery}
                href={`/${locale}/search/product?query=${encodeURIComponent(popularQuery)}`}
                {...trackShortcutActivation(() =>
                  track(AnalyticsEvents.EMPTY_SEARCH_STRIPE_CLICKED, { queryText: popularQuery })
                )}
                className="group inline-flex min-h-[36px] sm:min-h-0 shrink-0 items-center gap-1.5 rounded-full border border-dark-150 bg-white px-3.5 py-1.5 text-xs font-semibold text-dark-700 shadow-2xs transition-all duration-150 ease-out active:scale-[0.98] motion-reduce:transform-none hover:border-dark-300 hover:bg-surface-100 hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
              >
                <span aria-hidden="true" className="text-dark-400 transition-colors group-hover:text-dark-600">
                  #
                </span>
                <span className="whitespace-nowrap">{popularQuery}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-dark-900 break-words [word-break:keep-all]">
            {t('list.empty.categories')}
          </p>
          <div
            data-testid="search-empty-categories"
            className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"
            role="group"
            aria-label={t('list.empty.categories')}
            aria-busy={categoriesQuery.loading}
          >
            <SuggestionStatus
              loading={categoriesQuery.loading}
              errorMessage={categoriesQuery.error ? t('list.empty.categoriesError') : undefined}
              emptyMessage={categories.length === 0 ? t('list.empty.categoriesEmpty') : undefined}
              retry={() => void categoriesQuery.refetch().catch(() => {})}
            />
            {!categoriesQuery.loading &&
              !categoriesQuery.error &&
              categories.map(category => (
                <Link
                  key={category.id}
                  href={`/${locale}/categories/${encodeURIComponent(category.slug)}`}
                  {...trackShortcutActivation(() =>
                    track(AnalyticsEvents.CATEGORY_CHIP_CLICKED, {
                      categorySlug: category.slug,
                      source: 'empty-grid',
                    })
                  )}
                  className="group flex items-center gap-2.5 rounded-xl border border-dark-150 bg-white p-3 text-left text-sm font-semibold text-dark-800 shadow-button transition-all duration-150 ease-out active:scale-[0.98] motion-reduce:transform-none hover:border-dark-300 hover:bg-surface-100 hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-dark-150/70 bg-surface-100 text-lg leading-none shadow-2xs transition-colors group-hover:border-dark-300 group-hover:bg-white"
                  >
                    {getCategoryIcon(category.slug)}
                  </span>
                  <span className="truncate">{locale === 'ko' ? category.labelKo : category.labelEn}</span>
                </Link>
              ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-dark-900 break-words [word-break:keep-all]">
            {t('list.empty.trending')}
          </p>
          <div
            data-testid="search-empty-trending"
            aria-busy={trendingQuery.loading}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3"
          >
            <SuggestionStatus
              loading={trendingQuery.loading}
              errorMessage={trendingQuery.error ? t('list.empty.trendingError') : undefined}
              emptyMessage={trendingProducts.length === 0 ? t('list.empty.trendingEmpty') : undefined}
              retry={() => void trendingQuery.refetch().catch(() => {})}
            />
            {!trendingQuery.loading &&
              !trendingQuery.error &&
              trendingProducts.map((product, index) => (
                <div key={product.id} className="h-full min-w-0">
                  <ProductCard
                    product={product}
                    rank={index + 1}
                    href={`/${locale}/products/${encodeURIComponent(product.slug)}?from=empty-stripe`}
                    source="search-empty"
                    {...trackShortcutActivation(() =>
                      track(AnalyticsEvents.RANKED_PRODUCT_CLICKED, {
                        productSlug: product.slug,
                        source: 'search-empty-trending',
                      })
                    )}
                  />
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SuggestionStatus({
  loading,
  errorMessage,
  emptyMessage,
  retry,
}: Readonly<{
  loading: boolean;
  errorMessage?: string;
  emptyMessage?: string;
  retry: () => void;
}>) {
  const t = useTranslations('Search');
  if (loading) {
    return <output className="col-span-full text-sm text-dark-600">{t('list.empty.loading')}</output>;
  }
  if (!errorMessage) {
    return emptyMessage ? <p className="col-span-full text-sm text-dark-600">{emptyMessage}</p> : null;
  }
  return (
    <div className="col-span-full flex flex-col items-start gap-2">
      <p role="alert" className="text-sm text-dark-600">
        {errorMessage}
      </p>
      <Button type="button" size="sm" onClick={retry}>
        {t('list.empty.retry')}
      </Button>
    </div>
  );
}
