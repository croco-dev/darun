import { gql } from '@apollo/client';

export const VISUAL_APP_DETAIL_COLLECTION_SIZE = 24;
export const VISUAL_APPS_PAGE_SIZE = 24;

gql`
  query VisualAppsOnCatalog($query: String, $productSlug: String, $first: Int!, $after: String) {
    visualApps(query: $query, productSlug: $productSlug, first: $first, after: $after) {
      totalCount
      edges {
        node {
          id
          name
          slug
          summary
          logoUrl
          coverScreenshot {
            id
            imageUrl
            imageAlt
            title
            platform
            screenType
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
