import { gql } from '@apollo/client';
import { useRecentProductsOnRecentProductListSuspenseQuery } from './__generated__/useRecentProductList';

gql`
  query RecentProductsOnRecentProductList {
    recentProducts {
      id
      name
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
