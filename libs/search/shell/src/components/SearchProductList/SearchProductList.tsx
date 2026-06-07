'use client';

import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { AnalyticsEvents, track } from '@darun/analytics-client';
import { bind } from '@croco/utils-structure-react';
import { ProductCard, ProductItem } from '@darun/products-shell';
import { Link, useNavigate } from '@darun/utils-router';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
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
      <div className="flex flex-col gap-6 py-8 md:py-10">
        <div className="flex flex-col gap-2 text-center">
          <p className="text-[20px] font-semibold text-dark-800">{getNoResultsMessage()}</p>
          <p className="text-[14px] font-medium text-dark-600">{t('list.empty.description')}</p>
        </div>

        <div className="flex flex-col gap-3">
          <div
            data-testid="search-empty-popular-queries"
            className="flex gap-2 overflow-x-auto px-1 scrollbar-hide"
            role="list"
            aria-label="Popular searches"
          >
            {popularQueries.map((popularQuery) => (
              <button
                key={popularQuery}
                type="button"
                role="listitem"
                onClick={() => navigateToSearch(popularQuery)}
                className="rounded-full bg-surface-100 px-3 py-1.5 text-sm font-medium whitespace-nowrap text-dark-700 transition-colors hover:bg-brand-100 hover:text-brand-700"
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
                className="rounded-xl bg-surface-100 px-4 py-3 text-sm font-medium text-dark-700 transition-colors hover:bg-brand-100 hover:text-brand-700"
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
        <Link href={`/products/${product.slug}?from=search`} key={product.id} data-testid="search-card">
          <div className="bg-white rounded-[8px] border border-[rgba(0,0,0,0.12)] px-[18px] py-4 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.04)] transition-all duration-200 ease-in-out hover:border-[rgba(0,0,0,0.14)] hover:shadow-[0px_4px_8px_2px_rgba(0,0,0,0.08)]">
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
