import { gql } from '@apollo/client';

gql`
  query RecentProductsOnVisualApps($first: Int!) {
    recentProducts(first: $first) {
      id
      name
      slug
      summary
      logoUrl
    }
  }
`;

export const VISUAL_APPS_PAGE_SIZE = 24;
export const VISUAL_APP_DETAIL_COLLECTION_SIZE = 8;
