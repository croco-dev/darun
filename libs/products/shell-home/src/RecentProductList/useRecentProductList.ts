import { gql } from '@apollo/client';

gql`
  query RecentProductsOnRecentProductList {
    recentProducts {
      id
      name
    }
  }
`;
export function useRecentProductList() {
  return {};
}
