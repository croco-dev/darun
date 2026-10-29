'use client';

import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  EditProductOnEditProductDescriptionDocument,
  TempProductBySlugOnEditProductDescriptionDocument,
  TempProductBySlugOnProductDescriptionDocument,
} from '@darun/provider-graphql';
import { getEditorTableError } from '@darun/ui-admin';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useEffect, useState } from 'react';

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

export type UseEditProductDescriptionProps = {
  slug: string;
  onSubmit?: () => void;
  onCancel?: () => void;
};

export function useEditProductDescription({ slug, onSubmit, onCancel }: UseEditProductDescriptionProps) {
  const [saveError, setSaveError] = useState<string | null>(null);
  const { data } = useQuery(TempProductBySlugOnEditProductDescriptionDocument, {
    variables: { slug },
  });
  const description = data?.tempProductBySlug?.description ?? '';

  const form = useForm<FormValues>({
    mode: 'uncontrolled',
    initialValues: { description },
  });
  const { setInitialValues, setValues } = form;

  useEffect(() => {
    setInitialValues({ description });
    setValues({ description });
  }, [slug, description, setInitialValues, setValues]);

  const [editDescription, { loading }] = useMutation(EditProductOnEditProductDescriptionDocument, {
    refetchQueries: [
      {
        query: TempProductBySlugOnEditProductDescriptionDocument,
        variables: { slug },
      },
      {
        query: TempProductBySlugOnProductDescriptionDocument,
        variables: { slug },
      },
    ],
    awaitRefetchQueries: true,
    onCompleted: ({ editProduct }) => {
      if (editProduct?.product?.id) {
        notifications.show({ message: '수정되었습니다!', color: 'teal' });
        const description = editProduct.product.description ?? '';
        form.setInitialValues({ description });
        form.setValues({ description });
        onSubmit?.();
      }
    },
  });

  const submit = async (values: FormValues) => {
    if (loading) {
      return;
    }
    const tableError = getEditorTableError(values.description ?? '');
    if (tableError) {
      setSaveError(tableError);
      return;
    }
    const hasContent = (() => {
      const desc = values.description?.trim();
      if (!desc) return false;
      if (typeof DOMParser !== 'undefined') {
        const doc = new DOMParser().parseFromString(desc, 'text/html');
        return Boolean(doc.body.textContent?.trim() || doc.body.querySelector('img, video, iframe'));
      }
      return Boolean(desc);
    })();

    if (!hasContent) {
      notifications.show({
        message: '설명 내용을 입력해주세요.',
        color: 'red',
      });
      return;
    }

    setSaveError(null);
    try {
      await editDescription({
        variables: { slug, input: { description: values.description || '' } },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '설명 저장에 실패했습니다.';
      setSaveError(message);
      notifications.show({ message, color: 'red' });
    }
  };

  return {
    saveError,
    form,
    submit,
    onCancel,
    defaultValue: description,
    loading,
  };
}
