import { gql } from '@apollo/client';

gql`
  query AppDetailOnVisualApps($slug: String!) {
    productBySlug(slug: $slug) {
      id
      name
      slug
      summary
      description
      logoUrl
    }
  }
`;

gql`
  query AppCollectionsOnVisualApps($productSlug: String!, $first: Int!) {
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
