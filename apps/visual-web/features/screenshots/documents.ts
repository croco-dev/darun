import { gql } from '@apollo/client';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query VisualScreenshotsOnExplorer(
    $query: String
    $platform: VisualPlatform
    $screenType: VisualScreenType
    $productSlug: String
    $first: Int!
    $after: String
  ) {
    visualScreenshots(
      query: $query
      platform: $platform
      screenType: $screenType
      productSlug: $productSlug
      first: $first
      after: $after
    ) {
      totalCount
      edges {
        cursor
        node {
          id
          imageUrl
          imageAlt
          title
          platform
          screenType
          product {
            id
            name
            slug
            logoUrl
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

export const VISUAL_SCREENSHOTS_PAGE_SIZE = 24;
