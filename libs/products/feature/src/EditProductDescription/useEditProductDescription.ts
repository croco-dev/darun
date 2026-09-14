'use client';

import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  EditProductOnEditProductDescriptionDocument,
  TempProductBySlugOnEditProductDescriptionDocument,
} from '@darun/provider-graphql';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useEffect, useRef } from 'react';

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
    form.setInitialValues({ description: data?.tempProductBySlug?.description ?? '' });
  }, [data, form]);

  const [editDescription, { loading }] = useMutation(EditProductOnEditProductDescriptionDocument, {
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

  const isSubmittingRef = useRef(false);

  const submit = async (values: FormValues) => {
    if (isSubmittingRef.current || loading) return;
    if (!values.description) {
      notifications.show({ message: '값을 입력해주세요!!', color: 'red' });
      return;
    }

    isSubmittingRef.current = true;
    try {
      await editDescription({
        variables: {
          slug,
          input: {
            description: values.description || '',
          },
        },
      });
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return {
    form,
    submit,
    defaultValue: data?.tempProductBySlug?.description ?? '',
    loading,
  };
}
