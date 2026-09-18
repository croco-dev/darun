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
    }
  }
`;
