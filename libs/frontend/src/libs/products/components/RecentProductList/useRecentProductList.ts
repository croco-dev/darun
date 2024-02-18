import { gql } from '@apollo/client';
import { useRecentProductsOnRecentProductListSuspenseQuery } from './__generated__/useRecentProductList';

gql`
  query RecentProductsOnRecentProductList {
    recentProducts {
      id
      name
      logoUrl
      summary
    }
  }
`;

export function useRecentProductList() {
  const { data } = useRecentProductsOnRecentProductListSuspenseQuery();
  return {
    products: data?.recentProducts ?? [],
  };
}
