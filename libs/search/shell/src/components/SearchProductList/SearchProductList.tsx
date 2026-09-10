'use client';

import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { AnalyticsEvents, track } from '@darun/analytics-client';
import { ProductCard } from '@darun/products-shell';
import {
  CompactCategoriesForSearchProductListDocument,
  CompactTrendingPreviewForSearchProductListDocument,
} from '@darun/provider-graphql';
import { Search } from '@darun/ui';
import { useNavigate } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { getCategoryIcon } from '../../shells/SearchEmptyState/CategoryShortcutGrid/CategoryShortcutGrid';
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
  const navigate = useNavigate();
  const searchParams = useSearchParams();
  const query = searchParams.get('query')?.trim() ?? '';

  useEffect(() => {
    if (!query || products.length === 0) return;
    track(AnalyticsEvents.SEARCH_PERFORMED, { query, resultCount: products.length });
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

  const navigateToSearch = (nextQuery: string) => {
    trackEmptySearchClick(nextQuery);
    navigate(`/${locale}/search/product?query=${encodeURIComponent(nextQuery)}`);
  };

  const navigateToCategory = (slug: string) => {
    trackEmptySearchClick(slug);
    navigate(`/${locale}/categories/${slug}`);
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
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-dark-150 bg-surface-100 text-dark-400 shadow-2xs">
            <Search size={22} />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-xl font-bold leading-tight text-dark-900 break-keep sm:text-2xl">
              {getNoResultsMessage()}
            </p>
            <p className="text-sm text-dark-600 break-keep sm:text-base">{t('list.empty.description')}</p>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-dark-900">{t('list.empty.popularQueries')}</p>
            <div
              data-testid="search-empty-popular-queries"
              className="flex gap-2 overflow-x-auto px-1 scrollbar-hide"
              role="list"
              aria-label="Popular searches"
            >
              {popularQueries.map(popularQuery => (
                <button
                  key={popularQuery}
                  type="button"
                  role="listitem"
                  onClick={() => navigateToSearch(popularQuery)}
                  className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-dark-150 bg-white px-3.5 py-1.5 text-xs font-semibold text-dark-700 shadow-2xs transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-dark-300 hover:bg-surface-100 hover:text-dark-900 hover:shadow-button-hover active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
                >
                  <span className="text-dark-400 transition-colors group-hover:text-dark-600">#</span>
                  {popularQuery}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-dark-900">{t('list.empty.categories')}</p>
            <div
              data-testid="search-empty-categories"
              className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"
              role="list"
              aria-label="Browse by category"
            >
              {categories.map(category => (
                <button
                  key={category.id}
                  type="button"
                  role="listitem"
                  onClick={() => navigateToCategory(category.slug)}
                  className="group flex items-center gap-2.5 rounded-xl border border-dark-150 bg-white p-3 text-left text-sm font-semibold text-dark-800 shadow-button transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-dark-300 hover:bg-surface-100 hover:text-dark-950 hover:shadow-button-hover active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-lg leading-none shadow-2xs transition-colors group-hover:bg-white">
                    {getCategoryIcon(category.slug)}
                  </span>
                  <span className="truncate">{locale === 'ko' ? category.labelKo : category.labelEn}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-dark-900">{t('list.empty.trending')}</p>
            <div data-testid="search-empty-trending" className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {trendingProducts.map((product, index) => (
                <div key={product.id} onClickCapture={() => trackEmptySearchClick(product.slug)}>
                  <ProductCard
                    product={product}
                    rank={index + 1}
                    href={`/${locale}/products/${product.slug}`}
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
        <p className="text-xs font-semibold text-dark-500 sm:text-sm">
          {locale === 'ko' ? (
            <>
              총 <span className="font-bold tabular-nums text-dark-900">{products.length}</span>개의 서비스
            </>
          ) : (
            <>
              <span className="font-bold tabular-nums text-dark-900">{products.length}</span> services found
            </>
          )}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-5">
        {products.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            href={`/${locale}/products/${product.slug}?from=search`}
            source="search"
          />
        ))}
      </div>
    </div>
  );
});
