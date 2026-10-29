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
import { useCallback, useEffect, useRef, useState } from 'react';

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
  const sourceRef = useRef({ slug, description });
  const lastObservedSourceRef = useRef({ slug, description });
  const productSessionRef = useRef({ slug });
  const [hasServerChange, setHasServerChange] = useState(false);

  const form = useForm<FormValues>({
    mode: 'controlled',
    initialValues: { description },
  });
  const { setInitialValues, setValues, resetDirty, getValues } = form;

  const acceptLatestDescription = useCallback(() => {
    sourceRef.current = { slug, description };
    setInitialValues({ description });
    setValues({ description });
    resetDirty({ description });
    setHasServerChange(false);
    setSaveError(null);
  }, [slug, description, setInitialValues, setValues, resetDirty]);

  useEffect(() => {
    const lastObserved = lastObservedSourceRef.current;
    if (lastObserved.slug === slug && lastObserved.description === description) return;
    lastObservedSourceRef.current = { slug, description };
    if (productSessionRef.current.slug !== slug) {
      productSessionRef.current = { slug };
      acceptLatestDescription();
    } else if (getValues().description === sourceRef.current.description) {
      acceptLatestDescription();
    } else {
      setHasServerChange(description !== sourceRef.current.description);
    }
  }, [slug, description, getValues, acceptLatestDescription]);

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
  });

  const save = async (values: FormValues) => {
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
    const productSession = productSessionRef.current;
    try {
      const result = await editDescription({
        variables: { slug, input: { description: values.description || '' } },
      });
      if (productSessionRef.current !== productSession) return;
      const product = result.data?.editProduct?.product;
      if (product?.id) {
        const description = product.description ?? '';
        sourceRef.current = { slug, description };
        setInitialValues({ description });
        setValues({ description });
        resetDirty({ description });
        setHasServerChange(false);
        notifications.show({ message: '수정되었습니다!', color: 'teal' });
        onSubmit?.();
      }
    } catch (error) {
      if (productSessionRef.current !== productSession) return;
      const message = error instanceof Error ? error.message : '설명 저장에 실패했습니다.';
      setSaveError(message);
      notifications.show({ message, color: 'red' });
    }
  };

  const submit = async (values: FormValues) => {
    if (hasServerChange) return;
    await save(values);
  };

  return {
    saveError,
    form,
    submit,
    onCancel,
    hasServerChange,
    acceptLatestDescription,
    overwriteWithDraft: () => save(getValues()),
    loading,
  };
}
