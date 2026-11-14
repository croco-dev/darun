import { gql } from '@apollo/client';

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
    }
  }
`;

gql`
  query VisualSiblingScreenshotsOnDetail($id: String!, $productSlug: String!, $first: Int!) {
    visualScreenshot(id: $id) {
      id
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

gql`
  mutation TrackVisualScreenshotView($id: String!) {
    trackVisualScreenshotView(id: $id) {
      tracked
    }
  }
`;
