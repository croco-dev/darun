import { gql } from '@apollo/client';
import { useRankedProductsOnRankedProductListSuspenseQuery } from './__generated__/useRankedProductList';

gql`
  query RankedProductsOnRankedProductList {
    rankedProducts(first: 30) {
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

export function useRankedProductList() {
  const { data } = useRankedProductsOnRankedProductListSuspenseQuery();
  return {
    products: data?.rankedProducts ?? [],
  };
}
