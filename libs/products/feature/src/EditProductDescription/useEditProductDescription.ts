'use client';

import { gql } from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useMutation } from '@apollo/client/react';
import { PRODUCT_DESCRIPTION_MEDIA_ELEMENTS, splitProductUsageConditions } from '@darun/products-domain/info';
import {
  EditProductOnEditProductDescriptionDocument,
  TempProductBySlugOnEditProductDescriptionDocument,
} from '@darun/provider-graphql';
import { getEditorTableError } from '@darun/ui-admin';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  beginProductDescriptionSave,
  readSavedProductDescription,
  useSavedProductDescription,
} from '../ProductDescription/useSavedProductDescription';

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

type DescriptionConflict = 'loading' | 'failed' | 'ready';

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
  const hasContent =
    doc.body.textContent?.trim() || doc.body.querySelector(PRODUCT_DESCRIPTION_MEDIA_ELEMENTS.join(','));
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
    verificationPending,
    verificationError,
    refetch,
  } = useSavedProductDescription(TempProductBySlugOnEditProductDescriptionDocument, slug);
  const product = data?.tempProductBySlug;
  const hasCurrentDescription = Boolean(product && !descriptionError);
  const descriptionReady = hasCurrentDescription || conflict !== null;
  const description = product?.description ?? null;
  const { body: formDescription, block: usageConditionsBlock } = splitProductUsageConditions(description ?? '');
  const sourceRef = useRef({ slug, description });
  const lastObservedSourceRef = useRef({ slug, description });
  const productSessionRef = useRef({ slug });
  const [hasObservedChange, setHasObservedChange] = useState(false);
  const hasServerChange = conflict !== null || hasObservedChange;
  let conflictStatus = conflict;
  if (hasServerChange && (conflict === 'ready' || conflict === null)) {
    if (verificationPending) conflictStatus = 'loading';
    else if (!product || descriptionError || verificationError) conflictStatus = 'failed';
  }

  useEffect(
    () => () => {
      savePending.current = false;
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
      const savedValues = {
        description: splitProductUsageConditions(pendingDescription ?? '').body,
      };
      setInitialValues(savedValues);
      setValues(savedValues);
      resetDirty(savedValues);
      setHasObservedChange(false);
      setSaveError(null);
    },
    [slug, setInitialValues, setValues, resetDirty]
  );

  useEffect(() => {
    if (!hasCurrentDescription || loading || conflict) return;
    const lastObserved = lastObservedSourceRef.current;
    if (lastObserved.slug === slug && lastObserved.description === description) return;
    lastObservedSourceRef.current = { slug, description };
    if (productSessionRef.current.slug !== slug) {
      productSessionRef.current = { slug };
      resetDraft(description);
    } else if (getValues().description === splitProductUsageConditions(sourceRef.current.description ?? '').body) {
      resetDraft(description);
    } else {
      setHasObservedChange(description !== sourceRef.current.description);
    }
  }, [slug, description, hasCurrentDescription, loading, conflict, getValues, resetDraft]);

  const [editDescription] = useMutation(EditProductOnEditProductDescriptionDocument);

  const refreshAfterConflict = async () => {
    const productSession = productSessionRef.current;
    setConflict('loading');
    try {
      // A read already in flight may have started before the rejected save.
      const result = await readSavedProductDescription(
        client,
        slug,
        TempProductBySlugOnEditProductDescriptionDocument,
        'conflict'
      );
      if (productSessionRef.current === productSession) {
        setConflict(result?.tempProductBySlug ? 'ready' : 'failed');
      }
    } catch {
      if (productSessionRef.current === productSession) setConflict('failed');
    }
  };

  const save = async (values: FormValues, expectedDescription: string | null) => {
    if (
      !descriptionReady ||
      savePending.current ||
      verificationPending ||
      verificationError ||
      (conflictStatus && conflictStatus !== 'ready') ||
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
      const confirmSave = beginProductDescriptionSave(client, slug);
      const result = await editDescription({
        variables: { slug, input: { description: descriptionToSave } },
        fetchPolicy: 'no-cache',
        // Older API deployments accept the existing mutation while ignoring this extension.
        context: { darunExpectedDescriptionHash: expectedDescriptionHash },
      });
      const product = result.data?.editProduct?.product;
      if (!product?.id) return;
      const current = confirmSave(product);
      onSaved?.(product.id);
      if (productSessionRef.current !== productSession) return;
      resetDraft(current.description ?? null);
      setConflict(null);
      notifications.show({ message: '수정되었습니다!', color: 'teal' });
      onSubmit?.();
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
    verificationError,
    verificationPending,
    retryDescription: () => void refetch(),
    form,
    usageConditionsBlock,
    submit,
    onCancel,
    hasServerChange,
    latestDescription: description,
    conflictRefresh: conflictStatus === 'ready' ? null : conflictStatus,
    refreshAfterConflict,
    acceptLatestDescription: () => {
      if (!product || (conflictStatus && conflictStatus !== 'ready')) return;
      lastObservedSourceRef.current = { slug, description };
      resetDraft(description);
      setConflict(null);
    },
    overwriteWithDraft: () => save(getValues(), description),
    loading,
    imageUploading,
    onImageUploadingChange,
  };
}
