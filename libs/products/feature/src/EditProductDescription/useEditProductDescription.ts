'use client';

import { gql } from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
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

export function normalizeProductDescriptionDraft(draft: string) {
  if (!draft.trim()) return '';
  if (typeof DOMParser === 'undefined') return draft;
  const doc = new DOMParser().parseFromString(draft, 'text/html');
  const hasContent = doc.body.textContent?.trim() || doc.body.querySelector('img, video, iframe, table, hr');
  return hasContent ? draft : '';
}

export type UseEditProductDescriptionProps = {
  slug: string;
  onSaved?: (productId: string) => void;
  onSubmit?: () => void;
  onCancel?: () => void;
};

export function useEditProductDescription({ slug, onSaved, onSubmit, onCancel }: UseEditProductDescriptionProps) {
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflictRefresh, setConflictRefresh] = useState<'loading' | 'failed' | null>(null);
  const imageUploadPending = useRef(false);
  const [imageUploading, setImageUploading] = useState(false);
  const onImageUploadingChange = useCallback((uploading: boolean) => {
    imageUploadPending.current = uploading;
    setImageUploading(uploading);
  }, []);
  const {
    client,
    data,
    error: descriptionError,
    loading: descriptionLoading,
    refetch,
  } = useQuery(TempProductBySlugOnEditProductDescriptionDocument, {
    variables: { slug },
  });
  const product = data?.tempProductBySlug;
  const descriptionReady = Boolean(product && !descriptionError);
  const description = product?.description ?? null;
  const formDescription = description ?? '';
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
    initialValues: { description: formDescription },
  });
  const { setInitialValues, setValues, resetDirty, getValues } = form;

  const acceptLatestDescription = useCallback(() => {
    sourceRef.current = { slug, description };
    setInitialValues({ description: formDescription });
    setValues({ description: formDescription });
    resetDirty({ description: formDescription });
    setHasServerChange(false);
    setSaveError(null);
  }, [slug, description, formDescription, setInitialValues, setValues, resetDirty]);

  useEffect(() => {
    if (!descriptionReady) return;
    const lastObserved = lastObservedSourceRef.current;
    if (lastObserved.slug === slug && lastObserved.description === description) return;
    lastObservedSourceRef.current = { slug, description };
    if (productSessionRef.current.slug !== slug) {
      productSessionRef.current = { slug };
      acceptLatestDescription();
    } else if (getValues().description === (sourceRef.current.description ?? '')) {
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

  const refreshAfterConflict = async () => {
    const productSession = productSessionRef.current;
    setConflictRefresh('loading');
    try {
      // Refresh the cache without replacing the editor's query result with a refetch error.
      const result = await client.query({
        query: TempProductBySlugOnEditProductDescriptionDocument,
        variables: { slug },
        fetchPolicy: 'network-only',
      });
      if (productSessionRef.current === productSession) {
        setConflictRefresh(result.data?.tempProductBySlug ? null : 'failed');
      }
    } catch {
      if (productSessionRef.current === productSession) setConflictRefresh('failed');
    }
  };

  const save = async (values: FormValues, expectedDescription: string | null) => {
    if (!descriptionReady || loading || conflictRefresh || imageUploadPending.current) {
      return;
    }
    const draft = values.description ?? '';
    const tableError = getEditorTableError(draft);
    if (tableError) {
      setSaveError(tableError);
      return;
    }
    const descriptionToSave = normalizeProductDescriptionDraft(draft);
    setSaveError(null);
    const productSession = productSessionRef.current;
    try {
      const result = await editDescription({
        variables: {
          slug,
          input: { description: descriptionToSave, expectedDescription },
        },
      });
      if (productSessionRef.current !== productSession) return;
      const product = result.data?.editProduct?.product;
      if (product?.id) {
        const description = product.description ?? null;
        sourceRef.current = { slug, description };
        const savedValues = { description: description ?? '' };
        setInitialValues(savedValues);
        setValues(savedValues);
        resetDirty(savedValues);
        setHasServerChange(false);
        notifications.show({ message: '수정되었습니다!', color: 'teal' });
        onSubmit?.();
      }
    } catch (error) {
      if (productSessionRef.current !== productSession) return;
      if (
        CombinedGraphQLErrors.is(error) &&
        error.errors.some(item => item.extensions?.code === 'DESCRIPTION_EDIT_CONFLICT')
      ) {
        await refreshAfterConflict();
        return;
      }
      const message = error instanceof Error ? error.message : '설명 저장에 실패했습니다.';
      setSaveError(message);
      notifications.show({ message, color: 'red' });
    }
  };

  const submit = async (values: FormValues) => {
    if (hasServerChange) return;
    await save(values, sourceRef.current.description);
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
    latestDescription: description,
    conflictRefresh,
    refreshAfterConflict,
    acceptLatestDescription,
    overwriteWithDraft: () => save(getValues(), description),
    loading,
    imageUploading,
    onImageUploadingChange,
  };
}
