import { gql } from '@apollo/client';

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

gql`
  query VisualSiblingFlowsOnDetail($productSlug: String!, $first: Int!) {
    visualFlows(first: $first, productSlug: $productSlug) {
      totalCount
      edges {
        node {
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
  }
`;

export const VISUAL_FLOW_DETAIL_RELATED_SIZE = 8;
export const VISUAL_FLOW_DETAIL_RELATED_FETCH_SIZE = 9;
