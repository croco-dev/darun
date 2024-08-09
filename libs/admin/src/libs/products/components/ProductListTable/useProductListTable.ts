import { gql } from '@apollo/client';
import { useAllProductsOnProductListTableQuery } from './__generated__/useProductListTable';

gql`
  query AllProductsOnProductListTable {
    allProducts(first: 50) {
      edges {
        cursor
        node {
          id
          slug
          name
          summary
        }
      }
    }
  }
`;

export function useProductListTable() {
  const { data } = useAllProductsOnProductListTableQuery();
  return { products: data?.allProducts.edges ?? [] };
}
