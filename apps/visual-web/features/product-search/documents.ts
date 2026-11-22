import { gql } from '@apollo/client';

gql`
  query SearchProductsOnVisualExplorer($query: String!) {
    searchProducts(query: $query) {
      id
      name
      slug
      logoUrl
    }
  }
`;

gql`
  query VisualAppsOnAppSuggestions($query: String!, $first: Int!) {
    visualApps(query: $query, first: $first) {
      edges {
        node {
          id
          name
          slug
          logoUrl
        }
      }
    }
  }
`;
