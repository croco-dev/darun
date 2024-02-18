import { gql } from '@apollo/client';
import { useProductsCountOnProductsCountSuspenseQuery } from './__generated__/useProductsCount';

gql`
  query ProductsCountOnProductsCount {
    productsCount
  }
`;

export function useProductsCount() {
  const { data } = useProductsCountOnProductsCountSuspenseQuery();
  return {
    count: data.productsCount,
  };
}
