'use client';

import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  EditProductOnEditProductDescriptionDocument,
  TempProductBySlugOnEditProductDescriptionDocument,
  TempProductBySlugOnProductDescriptionDocument,
} from '@darun/provider-graphql';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useEffect } from 'react';

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
  const { data } = useQuery(TempProductBySlugOnEditProductDescriptionDocument, {
    variables: { slug },
  });

  const form = useForm<FormValues>({
    mode: 'uncontrolled',
    initialValues: { description: data?.tempProductBySlug?.description ?? '' },
  });

  useEffect(() => {
    const description = data?.tempProductBySlug?.description ?? '';
    form.setInitialValues({ description });
    form.setValues({ description });
  }, [data, form]);

  const [editDescription, { loading }] = useMutation(EditProductOnEditProductDescriptionDocument, {
    refetchQueries: [TempProductBySlugOnEditProductDescriptionDocument, TempProductBySlugOnProductDescriptionDocument],
    awaitRefetchQueries: true,
    onCompleted: ({ editProduct }) => {
      if (editProduct.product.id) {
        notifications.show({ message: '수정되었습니다!', color: 'teal' });
        const description = editProduct.product.description ?? '';
        form.setInitialValues({ description });
        form.setValues({ description });
        onSubmit?.();
      }
    },
    onError: error => {
      notifications.show({ message: error.message, color: 'red' });
    },
  });

  const submit = async (values: FormValues) => {
    if (loading) {
      return;
    }
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
    loading,
  };
}
