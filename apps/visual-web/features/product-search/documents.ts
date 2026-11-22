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
  query VisualAppSuggestionsOnAppExplorer($query: String!, $first: Int!) {
    visualAppSuggestions(query: $query, first: $first) {
      id
      name
      slug
      logoUrl
    }
  }
`;
