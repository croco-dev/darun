'use client';

import { gql } from '@apollo/client';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useEffect } from 'react';
import {
  useEditProductOnEditProductDescriptionMutation,
  useTempProductBySlugOnEditProductDescriptionQuery,
} from './__generated__/useEditProductDescription';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query TempProductBySlugOnEditProductDescription($slug: String!) {
    tempProductBySlug(slug: $slug) {
      id
      description
    }
  }

  mutation EditProductOnEditProductDescription($input: EditProductInput!, $slug: String!) {
    editProduct(input: $input, slug: $slug) {
      product {
        id
        description
      }
    }
  }
`;

type FormValues = {
  description?: string;
};

export function useEditProductDescription({ slug, onSubmit }: { slug: string; onSubmit?: () => void }) {
  const { data } = useTempProductBySlugOnEditProductDescriptionQuery({
    variables: { slug },
  });

  const form = useForm<FormValues>({
    mode: 'uncontrolled',
    initialValues: { description: data?.tempProductBySlug?.description ?? '' },
  });

  useEffect(() => {
    form.setInitialValues({ description: data?.tempProductBySlug?.description ?? '' });
  }, [data, form]);

  const [editDescription] = useEditProductOnEditProductDescriptionMutation({
    onCompleted: ({ editProduct }) => {
      if (editProduct.product.id) {
        notifications.show({ message: '수정되었습니다!', color: 'teal' });
        form.setInitialValues({ description: editProduct.product.description ?? '' });
        onSubmit?.();
      }
    },
    onError: error => {
      notifications.show({ message: error.message, color: 'red' });
    },
  });

  const submit = async (values: FormValues) => {
    if (!values.description) {
      notifications.show({ message: '값을 입력해주세요!!', color: 'red' });
      return;
    }

    await editDescription({
      variables: {
        slug,
        input: {
          description: values.description || '',
        },
      },
    });
  };

  return {
    form,
    submit,
    defaultValue: data?.tempProductBySlug?.description ?? '',
  };
}
