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
  onSaved?: (productId: string) => void;
  onSubmit?: () => void;
  onCancel?: () => void;
};

export function useEditProductDescription({ slug, onSaved, onSubmit, onCancel }: UseEditProductDescriptionProps) {
  const [saveError, setSaveError] = useState<string | null>(null);
  const imageUploadPending = useRef(false);
  const [imageUploading, setImageUploading] = useState(false);
  const onImageUploadingChange = useCallback((uploading: boolean) => {
    imageUploadPending.current = uploading;
    setImageUploading(uploading);
  }, []);
  const {
    data,
    error: descriptionError,
    loading: descriptionLoading,
    refetch,
  } = useQuery(TempProductBySlugOnEditProductDescriptionDocument, {
    variables: { slug },
  });
  const product = data?.tempProductBySlug;
  const descriptionReady = Boolean(product && !descriptionError);
  const description = product?.description ?? '';
  const sourceRef = useRef({ slug, description });
  const lastObservedSourceRef = useRef({ slug, description });
  const productSessionRef = useRef({ slug });
  const [hasServerChange, setHasServerChange] = useState(false);

  useEffect(
    () => () => {
      productSessionRef.current = { slug };
    },
    [slug]
  );

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
    if (!descriptionReady) return;
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
  }, [slug, description, descriptionReady, getValues, acceptLatestDescription]);

  const [editDescription, { loading }] = useMutation(EditProductOnEditProductDescriptionDocument, {
    refetchQueries: ({ data }) => {
      const productId = data?.editProduct?.product?.id;
      if (productId) onSaved?.(productId);
      return [
        { query: TempProductBySlugOnEditProductDescriptionDocument, variables: { slug } },
        { query: TempProductBySlugOnProductDescriptionDocument, variables: { slug } },
      ];
    },
    awaitRefetchQueries: true,
  });

  const save = async (values: FormValues) => {
    if (!descriptionReady || loading || imageUploadPending.current) {
      return;
    }
    const draft = values.description ?? '';
    const tableError = getEditorTableError(draft);
    if (tableError) {
      setSaveError(tableError);
      return;
    }
    const hasContent = (() => {
      if (!draft.trim()) return false;
      if (typeof DOMParser === 'undefined') return true;
      const doc = new DOMParser().parseFromString(draft, 'text/html');
      return Boolean(doc.body.textContent?.trim() || doc.body.querySelector('img, video, iframe, table, hr'));
    })();

    setSaveError(null);
    const productSession = productSessionRef.current;
    try {
      const result = await editDescription({
        variables: { slug, input: { description: hasContent ? draft : '' } },
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
    descriptionError,
    descriptionLoading,
    descriptionReady,
    retryDescription: () => void refetch().catch(() => {}),
    form,
    submit,
    onCancel,
    hasServerChange,
    acceptLatestDescription,
    overwriteWithDraft: () => save(getValues()),
    loading,
    imageUploading,
    onImageUploadingChange,
  };
}
