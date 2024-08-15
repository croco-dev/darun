import { gql } from '@apollo/client';
import { useForm } from '@mantine/form';
import { useThrottledCallback } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { ChangeEvent, useCallback } from 'react';
import {
  useEditProductOnEditAlternativeProductsMutation,
  useSearchProductsOnEditAlternativeProductsLazyQuery,
  useTempProductBySlugOnEditAlternativeProductsQuery,
} from './__generated__/useEditAlternativeProducts';

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
  const { data } = useTempProductBySlugOnEditAlternativeProductsQuery({
    variables: { slug },
    onCompleted: ({ tempProductBySlug }) => {
      form.setValues({
        alternativeIds: tempProductBySlug?.alternatives.map(({ id }) => id) ?? [],
      });
    },
  });

  const form = useForm<FormValues>({
    initialValues: {
      alternativeIds: [],
    },
  });
  const [searchProducts, { data: searchData }] = useSearchProductsOnEditAlternativeProductsLazyQuery();

  const [updateAlternativeProducts] = useEditProductOnEditAlternativeProductsMutation({
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

    await updateAlternativeProducts({
      variables: {
        slug,
        input: {
          alternativeProductIds: values.alternativeIds ?? [],
        },
      },
    });
  };

  const search = useThrottledCallback((query: string) => searchProducts({ variables: { query } }), 300);

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
