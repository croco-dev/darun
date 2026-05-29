'use client';

import { gql } from '@apollo/client';
import { useThrottledCallback } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useRef, useState } from 'react';
import { useSearchProductsOnSearchProductFieldLazyQuery } from './__generated__/useSearchProductField';

export const searchProductsOnSearchProductFieldQueryDocument = gql`
  query SearchProductsOnSearchProductField($query: String!) {
    searchProducts(query: $query) {
      id
      name
    }
  }
`;
type SearchProductFieldProps = {
  onSelect: (productId: string | null) => void;
};

export function useSearchProductField({ onSelect }: SearchProductFieldProps) {
  const [search] = useSearchProductsOnSearchProductFieldLazyQuery();
  const [products, setProducts] = useState<{ label: string; value: string }[]>([]);
  const latestSearchRequestId = useRef(0);

  const searchProduct = useThrottledCallback(async (query: string) => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      latestSearchRequestId.current += 1;
      setProducts([]);
      return;
    }

    const requestId = latestSearchRequestId.current + 1;
    latestSearchRequestId.current = requestId;

    let data: Awaited<ReturnType<typeof search>>['data'] | undefined;
    try {
      ({ data } = await search({
        variables: {
          query: trimmedQuery,
        },
      }));
    } catch (error) {
      console.error('Search failed:', error);
      if (requestId === latestSearchRequestId.current) {
        setProducts([]);
      }
      notifications.show({ message: '검색 중 오류가 발생했습니다.', color: 'red' });
      return;
    }

    if (requestId !== latestSearchRequestId.current) {
      return;
    }

    setProducts(
      data?.searchProducts.map(({ id, name }) => ({
        label: name,
        value: id,
      })) ?? []
    );
  }, 500);

  return {
    products,
    searchProduct,
    selectProduct: onSelect,
  };
}
