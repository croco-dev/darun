'use client';

import { gql } from '@apollo/client';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client/react';
import {
  EditProductOnEditAlternativeProductsDocument,
  SearchProductsOnEditAlternativeProductsDocument,
  TempProductBySlugOnEditAlternativeProductsDocument,
} from '@darun/provider-graphql';
import { useForm } from '@mantine/form';
import { useThrottledCallback } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { ChangeEvent, useCallback, useEffect, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
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

type FormValues = {
  alternativeIds?: string[];
};

export type UseEditAlternativeProductsProps = {
  slug: string;
  onSubmit?: () => void;
  onCancel?: () => void;
};

export function useEditAlternativeProducts({ slug, onSubmit, onCancel }: UseEditAlternativeProductsProps) {
  const [searchedProducts, setSearchedProducts] = useState<Array<{ id: string; name: string }>>([]);

  const { data } = useQuery(TempProductBySlugOnEditAlternativeProductsDocument, {
    variables: { slug },
  });

  const form = useForm<FormValues>({
    mode: 'uncontrolled',
    initialValues: {
      alternativeIds: [],
    },
  });
  const [searchProducts, { data: searchData }] = useLazyQuery(SearchProductsOnEditAlternativeProductsDocument);

  useEffect(() => {
    const rawAlternatives = data?.tempProductBySlug?.alternatives ?? [];
    const alternativeIds = rawAlternatives.map(item => item.id).filter((id): id is string => typeof id === 'string');
    form.setInitialValues({ alternativeIds });
    form.setValues({ alternativeIds });
  }, [data, form]);

  const [updateAlternativeProducts, { loading }] = useMutation(EditProductOnEditAlternativeProductsDocument, {
    refetchQueries: [TempProductBySlugOnEditAlternativeProductsDocument],
    awaitRefetchQueries: true,
    onCompleted: ({ updateAlternativeProduct }) => {
      if (updateAlternativeProduct.product?.id) {
        notifications.show({ message: '수정되었습니다!', color: 'teal' });
        const rawAlternatives = updateAlternativeProduct.product.alternatives ?? [];
        const alternativeIds = rawAlternatives
          .map(item => item.id)
          .filter((id): id is string => typeof id === 'string');
        form.setInitialValues({ alternativeIds });
        form.reset();

        onSubmit?.();
      }
    },
    onError: error => {
      console.error('mutation failed:', error);
      notifications.show({ message: '수정에 실패했습니다.', color: 'red' });
    },
  });

  const submit = async (values: FormValues) => {
    if (loading) return;

    if (!values.alternativeIds) {
      notifications.show({ message: '대안 서비스를 선택해주세요.', color: 'red' });
      return;
    }

    try {
      await updateAlternativeProducts({
        variables: {
          slug,
          input: {
            alternativeProductIds: values.alternativeIds ?? [],
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
      notifications.show({ message: '검색 중 오류가 발생했습니다.', color: 'red' });
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

  const currentAlternativeIds = form.getValues().alternativeIds ?? [];

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
    form,
    submit,
    onCancel,
    updateQuery,
    loading,
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
