import { gql, NetworkStatus } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { AnalyticsEvents, track } from '@darun/analytics-client';
import {
  SearchProductsOnSearchProductListDocument,
  SearchProductsOnSearchProductListQuery,
} from '@darun/provider-graphql';
import { useLocale } from 'next-intl';
import { useEffect, useRef } from 'react';

const SEARCH_PRODUCTS_QUERY = gql`
  query SearchProductsOnSearchProductList($query: String!, $locale: String!) {
    searchProducts(query: $query, locale: $locale) {
      id
      slug
      name
      logoUrl
      summary
      tags {
        id
        name
      }
    }
  }
`;

type SearchProductListProps = { query: string };

export type SearchProduct = NonNullable<SearchProductsOnSearchProductListQuery['searchProducts']>[number];

export function useSearchProductList({ query }: SearchProductListProps) {
  const locale = useLocale();
  const { data, dataState, error, networkStatus } = useSuspenseQuery(SearchProductsOnSearchProductListDocument, {
    variables: { query, locale },
  });
  const lastTrackedSearch = useRef<{
    query: string;
    locale: string;
  } | null>(null);

  useEffect(() => {
    const searchQuery = query.trim();
    if (!searchQuery || error || dataState !== 'complete' || networkStatus !== NetworkStatus.ready) return;
    const previous = lastTrackedSearch.current;
    if (previous?.query === query && previous.locale === locale) return;
    lastTrackedSearch.current = { query, locale };
    track(AnalyticsEvents.SEARCH_PERFORMED, {
      query: searchQuery,
      resultCount: data.searchProducts.length,
    });
  }, [query, locale, data, dataState, error, networkStatus]);

  return { products: data?.searchProducts ?? [], query: query.trim() };
}
