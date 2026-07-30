'use client';

import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { AnalyticsEvents, track } from '@darun/analytics-client';
import { ProductCard, ProductItem } from '@darun/products-shell';
import { Link, useNavigate } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useSearchProductList } from './useSearchProductList';

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

type Category = {
  id: string;
  slug: string;
  labelKo: string;
  labelEn: string;
};

type CategoriesQueryResult = {
  categories: Category[];
};

type TrendingProduct = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  summary?: string | null;
  voteCount: number;
  tags: Array<{ id: string; name: string }>;
};

type TrendingPreviewQueryResult = {
  rankedProducts: TrendingProduct[];
};

type SearchProductListViewProps = {
  products: NonNullable<ReturnType<typeof useSearchProductList>['products']>;
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
  const { data: categoriesData } = useSuspenseQuery(CATEGORIES_QUERY, {
    variables: { first: 4, locale },
  });
  const { data: trendingData } = useSuspenseQuery(TRENDING_PREVIEW_QUERY, {
    variables: { first: 3, locale },
  });

  const categories = (categoriesData as CategoriesQueryResult | undefined)?.categories ?? [];
  const trendingProducts = (trendingData as TrendingPreviewQueryResult | undefined)?.rankedProducts ?? [];

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
      <div className="flex flex-col gap-6 py-6 md:py-8">
        <div className="flex flex-col gap-1 text-center">
          <p className="text-xl font-bold text-dark-900 sm:text-2xl">{getNoResultsMessage()}</p>
          <p className="text-sm text-dark-600 sm:text-base">{t('list.empty.description')}</p>
        </div>

        <div className="flex flex-col gap-3">
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
                className="rounded-full bg-surface-100 px-3 py-1.5 text-sm font-medium whitespace-nowrap text-dark-700 transition-colors hover:bg-brand-100 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/70 focus-visible:ring-offset-2 motion-reduce:transition-none"
              >
                {popularQuery}
              </button>
            ))}
          </div>

          <div
            data-testid="search-empty-categories"
            className="grid grid-cols-2 gap-2 sm:grid-cols-4"
            role="list"
            aria-label="Browse by category"
          >
            {categories.map(category => (
              <button
                key={category.id}
                type="button"
                role="listitem"
                onClick={() => navigateToCategory(category.slug)}
                className="rounded-xl bg-surface-100 px-4 py-3 text-sm font-medium text-dark-700 transition-colors hover:bg-brand-100 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/70 focus-visible:ring-offset-2 motion-reduce:transition-none"
              >
                {locale === 'ko' ? category.labelKo : category.labelEn}
              </button>
            ))}
          </div>

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
    );
  return (
    <div className="flex flex-col gap-5">
      {products.map(product => (
        <Link
          href={`/products/${product.slug}?from=search`}
          key={product.id}
          data-testid="search-card"
          className="group h-full focus-visible:outline-none"
        >
          <div className="relative rounded-card border border-surface-300 bg-white p-4 shadow-card transition-all duration-200 ease-out group-hover:-translate-y-1 group-hover:border-brand-300 group-hover:shadow-card-hover group-focus-visible:-translate-y-1 group-focus-visible:border-brand-300 group-focus-visible:shadow-card-hover group-focus-visible:ring-2 group-focus-visible:ring-brand-500/70 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-white active:translate-y-0 active:scale-[0.99] motion-reduce:transform-none motion-reduce:transition-none md:rounded-card-lg">
            <ProductItem
              name={product.name}
              summary={product.summary}
              logoSize={'small'}
              logoUrl={product.logoUrl}
              tagVariant={'circle'}
              tags={product.tags.map(tag => tag.name)}
              maxTagItems={3}
            />
          </div>
        </Link>
      ))}
    </div>
  );
});
