'use client';

import { gql } from '@apollo/client';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client/react';
import {
  EditProductOnEditAlternativeProductsDocument,
  SearchProductsOnEditAlternativeProductsDocument,
  TempProductBySlugOnEditAlternativeProductsDocument,
} from '@darun/provider-graphql';
import { useThrottledCallback } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { ChangeEvent, useCallback, useState } from 'react';

gql`
  query TempProductBySlugOnEditAlternativeProducts($slug: String!) {
    tempProductBySlug(slug: $slug) {
      id
      alternatives {
        id
        name
      }
    }
  }

  query SearchProductsOnEditAlternativeProducts($query: String!) {
    searchProducts(query: $query) {
      id
      name
    }
  }

  mutation EditProductOnEditAlternativeProducts($input: UpdateAlternativeProductInput!, $slug: String!) {
    updateAlternativeProduct(input: $input, slug: $slug) {
      product {
        id
        alternatives {
          id
        }
      }
    }
  }
`;

export type UseEditAlternativeProductsProps = {
  slug: string;
  onSubmit?: () => void;
  onCancel?: () => void;
};

export function useEditAlternativeProducts({ slug, onSubmit, onCancel }: UseEditAlternativeProductsProps) {
  const [searchedProducts, setSearchedProducts] = useState<Array<{ id: string; name: string }>>([]);

  const {
    data,
    loading: isLoading,
    error,
    refetch,
  } = useQuery(TempProductBySlugOnEditAlternativeProductsDocument, {
    variables: { slug },
  });
  const product = data?.tempProductBySlug;
  const isReady = !isLoading && !error && Boolean(product?.id);
  const isNotFound = !isLoading && !error && !product;
  const [selection, setSelection] = useState<{
    slug: string;
    productId: string;
    ids: string[];
  } | null>(null);
  const currentAlternativeIds =
    selection?.slug === slug && selection.productId === product?.id
      ? selection.ids
      : (product?.alternatives ?? []).map(item => item.id);
  const setAlternativeIds = (ids: string[]) => {
    if (!isReady || !product) return;
    setSelection({ slug, productId: product.id, ids });
  };
  const [searchProducts, { data: searchData }] = useLazyQuery(SearchProductsOnEditAlternativeProductsDocument);

  const [updateAlternativeProducts, { loading }] = useMutation(EditProductOnEditAlternativeProductsDocument, {
    refetchQueries: [TempProductBySlugOnEditAlternativeProductsDocument],
    awaitRefetchQueries: true,
    onCompleted: ({ updateAlternativeProduct }) => {
      if (updateAlternativeProduct?.product?.id) {
        notifications.show({ message: '수정되었습니다!', color: 'teal' });
        const rawAlternatives = updateAlternativeProduct.product.alternatives ?? [];
        const alternativeIds = rawAlternatives
          .map(item => item.id)
          .filter((id): id is string => typeof id === 'string');
        setSelection({
          slug,
          productId: updateAlternativeProduct.product.id,
          ids: alternativeIds,
        });

        onSubmit?.();
      }
    },
    onError: error => {
      console.error('mutation failed:', error);
      notifications.show({ message: '수정에 실패했습니다.', color: 'red' });
    },
  });

  const submit = async () => {
    if (loading || !isReady) return;

    try {
      await updateAlternativeProducts({
        variables: {
          slug,
          input: {
            alternativeProductIds: currentAlternativeIds,
          },
        },
      });
    } catch (error) {
      console.error('mutation failed:', error);
    }
  };

  const search = useThrottledCallback(async (query: string) => {
    try {
      const res = await searchProducts({ variables: { query } });
      const foundProducts = res.data?.searchProducts;
      if (foundProducts) {
        setSearchedProducts(prev => {
          const map = new Map<string, string>();
          for (const item of prev) {
            map.set(item.id, item.name);
          }
          for (const item of foundProducts) {
            if (item.id && item.name) {
              map.set(item.id, item.name);
            }
          }
          return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
        });
      }
    } catch (error) {
      console.error('Search failed:', error);
      notifications.show({
        message: '검색 중 오류가 발생했습니다.',
        color: 'red',
      });
    }
  }, 300);

  const updateQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const query = event.target.value;
      if (!query) {
        return;
      }

      search(query);
    },
    [search]
  );

  const currentProductId = data?.tempProductBySlug?.id;
  const currentAlternatives = data?.tempProductBySlug?.alternatives ?? [];
  const allKnownProducts = [...currentAlternatives, ...searchedProducts];
  const uniqueProductsMap = new Map<string, string>();
  for (const p of allKnownProducts) {
    if (p.id && p.name) {
      uniqueProductsMap.set(p.id, p.name);
    }
  }

  const selectedItems = currentAlternativeIds.map(id => ({
    value: id,
    label: uniqueProductsMap.get(id) ?? id,
  }));

  const currentSearchList = searchData?.searchProducts ?? [];
  const searchItems = currentSearchList
    .filter(p => Boolean(p.id) && p.id !== currentProductId && !currentAlternativeIds.includes(p.id))
    .map(p => ({
      label: p.name,
      value: p.id,
    }));

  return {
    alternativeIds: currentAlternativeIds,
    setAlternativeIds,
    submit,
    onCancel,
    updateQuery,
    loading,
    isLoading,
    isReady,
    isNotFound,
    error,
    retry: () => void refetch().catch(() => {}),
    selectData: [
      {
        group: '선택됨',
        items: selectedItems,
      },
      {
        group: '검색 결과',
        items: searchItems,
      },
    ],
  };
}
