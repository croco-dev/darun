import { gql } from '@apollo/client';
import { useRecentProductsOnRecentProductListSuspenseQuery } from './__generated__/useRecentProductList';

gql`
  query RecentProductsOnRecentProductList {
    recentProducts(first: 8) {
      id
      name
      slug
      logoUrl
      summary
      tags {
        id
        name
      }
    }
  }
`;

export function useRecentProductList() {
  const { data } = useRecentProductsOnRecentProductListSuspenseQuery();
  return {
    products: data?.recentProducts ?? [],
  };
}
