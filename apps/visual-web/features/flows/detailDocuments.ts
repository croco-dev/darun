import { gql } from '@apollo/client';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query VisualFlowOnDetail($id: String!) {
    visualFlow(id: $id) {
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
      steps {
        position
        caption
        screenshot {
          id
          imageUrl
          imageAlt
          title
        }
      }
      product {
        id
        name
        slug
        logoUrl
        summary
      }
    }
  }
`;
