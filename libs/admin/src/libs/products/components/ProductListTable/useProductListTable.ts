import { gql } from '@apollo/client';
import { useState } from 'react';
import { useAllProductsOnProductListTableSuspenseQuery } from './__generated__/useProductListTable';

gql`
  query AllProductsOnProductListTable($first: Int, $after: String, $last: Int, $before: String) {
    allProducts(first: $first, after: $after, last: $last, before: $before) {
      edges {
        cursor
        node {
          id
          logoUrl
          slug
          name
          summary
        }
      }
      pageInfo {
        endCursor
        hasNextPage
        startCursor
        hasPreviousPage
      }
      totalCount
    }
  }
`;

const defaultViewCount = 50;

export function useProductListTable() {
  const [pageCount, setPageCount] = useState(0);
  const { data, refetch } = useAllProductsOnProductListTableSuspenseQuery({
    variables: { first: defaultViewCount },
  });

  const loadNextPage = () => {
    setPageCount(pageCount + defaultViewCount + 1);
    refetch({
      first: defaultViewCount,
      after: data?.allProducts.pageInfo.endCursor,
      last: undefined,
      before: undefined,
    });
  };

  const loadPreviousPage = () => {
    setPageCount(pageCount - defaultViewCount - 1);
    refetch({
      first: undefined,
      after: undefined,
      last: defaultViewCount,
      before: data?.allProducts.pageInfo.startCursor,
    });
  };

  return {
    products: data?.allProducts.edges ?? [],
    totalCount: data?.allProducts.totalCount,
    hasNextPage: data?.allProducts.pageInfo.hasNextPage,
    hasPreviousPage: data?.allProducts.pageInfo.hasPreviousPage,
    pageCount,
    loadNextPage,
    loadPreviousPage,
  };
}
