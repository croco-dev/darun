import { gql } from '@apollo/client';
import { useAllProductsOnProductListTableSuspenseQuery } from './__generated__/useProductListTable';

gql`
  query AllProductsOnProductListTable {
    allProducts(first: 10) {
      edges {
        cursor
      }
    }
  }
`;
export function useProductListTable() {
  const { data } = useAllProductsOnProductListTableSuspenseQuery();
  return {};
}
