import { gql } from '@apollo/client';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query VisualScreenshotOnDetail($id: String!) {
    visualScreenshot(id: $id) {
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
        summary
        logoUrl
      }
      flows {
        id
        title
        stepCount
        coverScreenshot {
          id
          imageUrl
          imageAlt
        }
      }
    }
  }
`;

gql`
  query VisualSiblingScreenshotsOnDetail($productSlug: String!, $first: Int!) {
    visualScreenshots(first: $first, productSlug: $productSlug) {
      totalCount
      edges {
        node {
          id
          imageUrl
          imageAlt
          title
        }
      }
    }
  }
`;

export const VISUAL_SCREENSHOT_DETAIL_RELATED_SIZE = 8;
export const VISUAL_SCREENSHOT_DETAIL_RELATED_FETCH_SIZE = 9;

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  mutation TrackVisualScreenshotView($id: String!) {
    trackVisualScreenshotView(id: $id) {
      tracked
    }
  }
`;
