import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { ProductsCountOnProductsCountDocument } from '@darun/provider-graphql';


gql`
  query ProductsCountOnProductsCount {
    productsCount
  }
`;

export function useProductsCount() {
  const { data } = useSuspenseQuery(ProductsCountOnProductsCountDocument);
  return {
    count: data?.productsCount,
  };
}
