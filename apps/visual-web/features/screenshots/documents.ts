import { gql } from '@apollo/client';

gql`
  query VisualScreenshotsOnExplorer(
    $query: String
    $platform: VisualPlatform
    $screenType: VisualScreenType
    $uiElements: [VisualUiElement!]
    $productSlug: String
    $first: Int!
    $after: String
  ) {
    visualScreenshots(
      query: $query
      platform: $platform
      screenType: $screenType
      uiElements: $uiElements
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
            summary
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
