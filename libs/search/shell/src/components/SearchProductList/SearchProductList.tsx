'use client';

import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { AnalyticsEvents, track } from '@darun/analytics-client';
import { ProductCard, getCategoryIcon } from '@darun/products-shell';
import {
  CompactCategoriesForSearchProductListDocument,
  CompactTrendingPreviewForSearchProductListDocument,
} from '@darun/provider-graphql';
import { Search } from '@darun/ui';
import { Link, useSearchParams } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { SearchProduct, useSearchProductList } from './useSearchProductList';

const POPULAR_QUERIES: Record<string, string[]> = {
  ko: ['프로덕트헌트', '노션', '피그마'],
  en: ['Product Hunt', 'Notion', 'Figma'],
};

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
};

export const SearchProductList = bind(useSearchProductList, ({ products }: SearchProductListViewProps) => {
  const t = useTranslations('Search');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const query = searchParams.get('query')?.trim() ?? '';

  useEffect(() => {
    if (!query || products.length === 0) return;
    track(AnalyticsEvents.SEARCH_PERFORMED, {
      query,
      resultCount: products.length,
    });
  }, [query, products]);

  const popularQueries = POPULAR_QUERIES[locale] ?? POPULAR_QUERIES.ko;
  const { data: categoriesData } = useSuspenseQuery(CompactCategoriesForSearchProductListDocument, {
    variables: { first: 4, locale },
  });
  const { data: trendingData } = useSuspenseQuery(CompactTrendingPreviewForSearchProductListDocument, {
    variables: { first: 3, locale },
  });

  const categories = categoriesData?.categories ?? [];
  const trendingProducts = trendingData?.rankedProducts ?? [];

  const trackEmptySearchClick = (queryText: string) => {
    track(AnalyticsEvents.EMPTY_SEARCH_STRIPE_CLICKED, { queryText });
  };

  const getNoResultsMessage = () => {
    try {
      return t('list.empty.noResults', { query });
    } catch {
      return t('list.empty.title');
    }
  };

  if (products.length === 0)
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
              className="flex gap-2 overflow-x-auto px-1 py-1.5 scrollbar-hide scroll-smooth scroll-pl-1 touch-pan-x rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
              role="group"
              aria-label={t('list.empty.popularQueries')}
            >
              {popularQueries.map(popularQuery => (
                <Link
                  key={popularQuery}
                  href={`/${locale}/search/product?query=${encodeURIComponent(popularQuery)}`}
                  onClick={() => trackEmptySearchClick(popularQuery)}
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
            >
              {categories.map(category => (
                <Link
                  key={category.id}
                  href={`/${locale}/categories/${encodeURIComponent(category.slug)}`}
                  onClick={() => trackEmptySearchClick(category.slug)}
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
            <div data-testid="search-empty-trending" className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {trendingProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="h-full min-w-0"
                  onClickCapture={() => trackEmptySearchClick(product.slug)}
                >
                  <ProductCard
                    product={product}
                    rank={index + 1}
                    href={`/${locale}/products/${encodeURIComponent(product.slug)}`}
                    source="search-empty"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span
          role="status"
          aria-live="polite"
          className="inline-flex select-none whitespace-nowrap items-center gap-1.5 rounded-lg border border-dark-150/80 bg-surface-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-dark-700 shadow-2xs"
        >
          {locale === 'ko' ? (
            <>
              총 <strong className="font-bold text-dark-900">{products.length.toLocaleString(locale)}</strong>
              개의 서비스
            </>
          ) : (
            <>
              <strong className="font-bold text-dark-900">{products.length.toLocaleString(locale)}</strong>{' '}
              {products.length === 1 ? 'service found' : 'services found'}
            </>
          )}
        </span>
      </div>
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
