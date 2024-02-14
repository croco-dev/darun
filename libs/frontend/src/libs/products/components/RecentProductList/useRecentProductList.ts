import { gql } from '@apollo/client';
import { useRecentProductsOnRecentProductListQuery } from './__generated__/useRecentProductList';

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
  const { data } = useRecentProductsOnRecentProductListQuery();
  return {
    products: data?.recentProducts ?? [],
  };
}
