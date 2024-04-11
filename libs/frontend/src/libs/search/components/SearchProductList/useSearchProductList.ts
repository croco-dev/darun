import { gql } from '@apollo/client';
import { useSearchProductsOnSearchProductListSuspenseQuery } from './__generated__/useSearchProductList';

gql`
  query SearchProductsOnSearchProductList($query: String!) {
    searchProducts(query: $query) {
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
  const { data } = useSearchProductsOnSearchProductListSuspenseQuery({ variables: { query } });
  return { products: data.searchProducts };
}
