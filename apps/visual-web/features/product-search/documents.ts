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
