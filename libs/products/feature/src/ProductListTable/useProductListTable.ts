import { gql } from '@apollo/client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAllProductsOnProductListTableSuspenseQuery } from './__generated__/useProductListTable';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
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
  const { push } = useRouter();
  const [pageCount, setPageCount] = useState(0);
  const { data, refetch } = useAllProductsOnProductListTableSuspenseQuery({
    variables: { first: defaultViewCount },
  });

  // Refs to prevent stale closure in callbacks
  const endCursorRef = useRef(data?.allProducts.pageInfo.endCursor);
  const startCursorRef = useRef(data?.allProducts.pageInfo.startCursor);

  useEffect(() => {
    endCursorRef.current = data?.allProducts.pageInfo.endCursor;
    startCursorRef.current = data?.allProducts.pageInfo.startCursor;
  }, [data]);

  const loadNextPage = () => {
    setPageCount(prev => prev + defaultViewCount + 1);
    refetch({
      first: defaultViewCount,
      after: endCursorRef.current,
      last: undefined,
      before: undefined,
    });
  };

  const loadPreviousPage = () => {
    setPageCount(prev => prev - defaultViewCount - 1);
    refetch({
      first: undefined,
      after: undefined,
      last: defaultViewCount,
      before: startCursorRef.current,
    });
  };

  const handleRowClick = ({ record: { slug } }: { record: { slug: string } }) => {
    push(`/products/${slug}`);
  };

  return {
    products: data?.allProducts.edges ?? [],
    totalCount: data?.allProducts.totalCount,
    hasNextPage: data?.allProducts.pageInfo.hasNextPage,
    hasPreviousPage: data?.allProducts.pageInfo.hasPreviousPage,
    pageCount,
    loadNextPage,
    loadPreviousPage,
    handleRowClick,
  };
}
