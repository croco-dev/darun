import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { SearchProductsOnSearchProductListDocument, SearchProductsOnSearchProductListQuery } from '@darun/provider-graphql';
import { useLocale } from 'next-intl';

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
      features {
        emoji
        id
        name
        summary
      }
    }
  }
`;

type SearchProductListProps = { query: string };

export type SearchProduct = NonNullable<SearchProductsOnSearchProductListQuery['searchProducts']>[number];

export function useSearchProductList({ query }: SearchProductListProps) {
  const locale = useLocale();
  const { data } = useSuspenseQuery(SearchProductsOnSearchProductListDocument, {
    variables: { query, locale },
  });
  return { products: data?.searchProducts ?? [] };
}
