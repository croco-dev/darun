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

type DescriptionConflict = { status: 'loading' | 'failed' } | { status: 'ready'; description: string | null };

async function hashDescription(description: string | null): Promise<string | null> {
  if (description === null) return null;
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('보안 연결로 다시 접속한 뒤 저장해 주세요.');
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(description));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

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
  const [previousSlug, setPreviousSlug] = useState(slug);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<DescriptionConflict | null>(null);
  const [loading, setLoading] = useState(false);
  if (previousSlug !== slug) {
    setPreviousSlug(slug);
    setConflict(null);
    setLoading(false);
  }
  const savePending = useRef(false);
  const acceptedConflict = useRef(false);
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
  const [hasObservedChange, setHasObservedChange] = useState(false);
  const hasServerChange = conflict !== null || hasObservedChange;
  const latestDescription = conflict?.status === 'ready' ? conflict.description : description;

  useEffect(
    () => () => {
      savePending.current = false;
      acceptedConflict.current = false;
      productSessionRef.current = { slug };
    },
    [slug]
  );

  const form = useForm<FormValues>({
    mode: 'controlled',
    initialValues: { description: formDescription },
  });
  const { setInitialValues, setValues, resetDirty, getValues } = form;

  const resetDraft = useCallback(
    (pendingDescription: string | null) => {
      sourceRef.current = { slug, description: pendingDescription };
      const savedValues = { description: pendingDescription ?? '' };
      setInitialValues(savedValues);
      setValues(savedValues);
      resetDirty(savedValues);
      setHasObservedChange(false);
      setSaveError(null);
    },
    [slug, setInitialValues, setValues, resetDirty]
  );

  useEffect(() => {
    if (!descriptionReady || loading || conflict || acceptedConflict.current) return;
    const lastObserved = lastObservedSourceRef.current;
    if (lastObserved.slug === slug && lastObserved.description === description) return;
    lastObservedSourceRef.current = { slug, description };
    if (productSessionRef.current.slug !== slug) {
      productSessionRef.current = { slug };
      resetDraft(description);
    } else if (getValues().description === (sourceRef.current.description ?? '')) {
      resetDraft(description);
    } else {
      setHasObservedChange(description !== sourceRef.current.description);
    }
  }, [slug, description, descriptionReady, loading, conflict, getValues, resetDraft]);

  const [editDescription] = useMutation(EditProductOnEditProductDescriptionDocument, {
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
    setConflict({ status: 'loading' });
    try {
      // A read already in flight may have started before the rejected save.
      const result = await client.query({
        query: TempProductBySlugOnEditProductDescriptionDocument,
        variables: { slug },
        fetchPolicy: 'no-cache',
        context: { queryDeduplication: false },
      });
      if (productSessionRef.current === productSession) {
        const latest = result.data?.tempProductBySlug;
        setConflict(latest ? { status: 'ready', description: latest.description ?? null } : { status: 'failed' });
      }
    } catch {
      if (productSessionRef.current === productSession) setConflict({ status: 'failed' });
    }
  };

  const save = async (values: FormValues, expectedDescription: string | null) => {
    if (
      !descriptionReady ||
      savePending.current ||
      (conflict && conflict.status !== 'ready') ||
      imageUploadPending.current
    ) {
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
    savePending.current = true;
    setLoading(true);
    try {
      const expectedDescriptionHash = await hashDescription(expectedDescription);
      if (productSessionRef.current !== productSession) return;
      const result = await editDescription({
        variables: { slug, input: { description: descriptionToSave } },
        // Older API deployments accept the existing mutation while ignoring this extension.
        context: { darunExpectedDescriptionHash: expectedDescriptionHash },
      });
      if (productSessionRef.current !== productSession) return;
      const product = result.data?.editProduct?.product;
      if (product?.id) {
        resetDraft(product.description ?? null);
        setConflict(null);
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
    } finally {
      if (productSessionRef.current === productSession) {
        savePending.current = false;
        setLoading(false);
      }
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
    latestDescription,
    conflictRefresh: conflict?.status === 'ready' ? null : (conflict?.status ?? null),
    refreshAfterConflict,
    acceptLatestDescription: () => {
      // Requests begun before conflict recovery can still update the shared cache.
      if (conflict?.status === 'ready') acceptedConflict.current = true;
      lastObservedSourceRef.current = { slug, description };
      resetDraft(latestDescription);
      setConflict(null);
    },
    overwriteWithDraft: () => save(getValues(), latestDescription),
    loading,
    imageUploading,
    onImageUploadingChange,
  };
}
