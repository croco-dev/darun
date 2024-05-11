import { gql } from '@apollo/client';
import { useAllProductsOnProductListTableSuspenseQuery } from './__generated__/useProductListTable';

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
  const { data } = useAllProductsOnProductListTableSuspenseQuery();
  return { products: data.allProducts.edges };
}
