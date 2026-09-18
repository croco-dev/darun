import { gql } from '@apollo/client';

export const VISUAL_FLOWS_PAGE_SIZE = 24;

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query VisualFlowsOnExplorer(
    $query: String
    $platform: VisualPlatform
    $flowType: VisualFlowType
    $productSlug: String
    $first: Int!
    $after: String
  ) {
    visualFlows(
      query: $query
      platform: $platform
      flowType: $flowType
      productSlug: $productSlug
      first: $first
      after: $after
    ) {
      totalCount
      edges {
        cursor
        node {
          id
          title
          description
          platform
          flowType
          stepCount
          coverScreenshot {
            id
            imageUrl
            imageAlt
          }
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
        endCursor
      }
    }
  }
`;
