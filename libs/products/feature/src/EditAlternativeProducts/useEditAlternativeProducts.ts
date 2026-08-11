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
import { ChangeEvent } from 'react';
import { useCallback } from 'react';
import { useEffect } from 'react';

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

export function useEditAlternativeProducts({ slug, onSubmit }: { slug: string; onSubmit?: () => void }) {
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
    form.setValues({
      alternativeIds: data?.tempProductBySlug?.alternatives.map(({ id }) => id) ?? [],
    });
  }, [data, form]);

  const [updateAlternativeProducts] = useMutation(EditProductOnEditAlternativeProductsDocument, {
    onCompleted: ({ updateAlternativeProduct }) => {
      if (updateAlternativeProduct.product?.id) {
        notifications.show({ message: '수정되었습니다!', color: 'teal' });
        form.reset();

        onSubmit?.();
      }
    },
  });

  const submit = async (values: FormValues) => {
    if (!values.alternativeIds) {
      notifications.show({ message: '값을 입력해주세요!!', color: 'red' });
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
      throw error;
    }
  };

  const search = useThrottledCallback(async (query: string) => {
    try {
      await searchProducts({ variables: { query } });
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

  const selectedItems =
    data?.tempProductBySlug?.alternatives.map(({ id, name }) => ({
      label: name,
      value: id,
    })) ?? [];

  const searchItems =
    searchData?.searchProducts
      .map(({ id, name }) => ({
        label: name,
        value: id,
      }))
      .filter(({ value }) => selectedItems.every(({ value: selectedValue }) => selectedValue !== value)) ?? [];

  return {
    form,
    submit,
    updateQuery,
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
