import { gql } from '@apollo/client';
import { useRecentProductsOnRecentProductListQuery } from './__generated__/useRecentProductList';

gql`
  query RecentProductsOnRecentProductList {
    recentProducts {
      id
      name
    }
  }
`;
export function useRecentProductList() {
  const { data } = useRecentProductsOnRecentProductListQuery();
  return {
    products: data?.recentProducts ?? [],
  };
}
