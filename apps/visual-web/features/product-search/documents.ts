import { gql } from '@apollo/client';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
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
