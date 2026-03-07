import { gql } from '@apollo/client';
import { useLocale } from 'next-intl';
import { useSearchProductsOnSearchProductListSuspenseQuery } from './__generated__/useSearchProductList';

gql`
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

export function useSearchProductList({ query }: SearchProductListProps) {
  const locale = useLocale();
  const { data } = useSearchProductsOnSearchProductListSuspenseQuery({
    variables: { query, locale },
  });
  return { products: data?.searchProducts ?? [] };
}
