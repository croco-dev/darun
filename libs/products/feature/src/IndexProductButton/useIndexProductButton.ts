import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  IndexProductOnIndexProductButtonDocument,
  ProductContentSyncStatusOnIndexProductButtonDocument,
  RetryProductContentSyncOnIndexProductButtonDocument,
} from '@darun/provider-graphql';
import { notifications } from '@mantine/notifications';
import { useEffect, useRef, useState } from 'react';

gql`
  mutation IndexProductOnIndexProductButton($input: IndexProductInput!) {
    indexProduct(input: $input) {
      intentId
      productId
      sourceRevision
      status
    }
  }
  query ProductContentSyncStatusOnIndexProductButton($slug: String!) {
    productContentSyncStatus(slug: $slug) {
      productId
      sourceRevision
      searchStatus
      translationDispatchStatus
      translationJobId
      translationJobStatus
      translationJobDispatchStatus
      searchIntent {
        intentId
        productId
        sourceRevision
        status
        error
      }
      translationIntent {
        intentId
        productId
        sourceRevision
        status
        error
      }
    }
  }
  mutation RetryProductContentSyncOnIndexProductButton($slug: String!) {
    retryProductContentSync(slug: $slug) {
      productId
      sourceRevision
      searchStatus
      translationDispatchStatus
      translationJobId
      translationJobStatus
    }
  }
`;

export function useIndexProductButton({ slug }: { slug: string }) {
  const [request, setRequest] = useState<{
    slug: string;
    intentId: string;
    productId: string;
    sourceRevision: string;
    generation: number;
  }>();
  if (request && request.slug !== slug) setRequest(undefined);
  const [observation, setObservation] = useState<{
    generation: number;
    productId?: string;
    status?: NonNullable<typeof data>['productContentSyncStatus']['searchIntent'];
    error?: string;
  }>();
  const generation = useRef(0);
  const activeSlug = useRef(slug);
  useEffect(() => {
    activeSlug.current = slug;
    return () => {
      generation.current += 1;
    };
  }, [slug]);
  const notified = useRef<number | undefined>(undefined);
  const intentId = request?.slug === slug ? request.intentId : undefined;
  const [indexProductMutation, { loading: registering }] = useMutation(IndexProductOnIndexProductButtonDocument);
  const [retrySyncMutation, { loading: retrying }] = useMutation(RetryProductContentSyncOnIndexProductButtonDocument);
  const { data, error, refetch } = useQuery(ProductContentSyncStatusOnIndexProductButtonDocument, {
    variables: { slug },
    fetchPolicy: 'network-only',
    // A new reservation must not share a lookup started by an older request.
    context: { queryDeduplication: false },
  });
  const syncStatus = data?.productContentSyncStatus;
  const syncProductId = syncStatus?.productId;
  const activeProductId = useRef(syncProductId);
  useEffect(() => {
    if (syncProductId) activeProductId.current = syncProductId;
  }, [syncProductId]);
  const current =
    intentId &&
    observation &&
    observation.generation === request?.generation &&
    observation.productId === request?.productId &&
    observation.status?.intentId === intentId &&
    observation.status.productId === request?.productId &&
    observation.status.sourceRevision === request?.sourceRevision
      ? observation.status
      : undefined;
  const superseded = Boolean(
    intentId &&
    request &&
    observation?.generation === request.generation &&
    observation.productId === request.productId &&
    observation.status &&
    observation.status.productId === request.productId &&
    observation.status.intentId !== intentId &&
    BigInt(observation.status.sourceRevision) > BigInt(request.sourceRevision)
  );
  const lookupError = intentId
    ? observation && observation.generation === request?.generation
      ? observation.error
      : undefined
    : error?.message;
  const terminal = current && ['completed', 'failed', 'superseded'].includes(current.status);
  const activeIntentStatuses = ['pending', 'in_progress'];
  const searchIntentActive = activeIntentStatuses.includes(syncStatus?.searchIntent?.status ?? '');
  const translationIntentActive = activeIntentStatuses.includes(syncStatus?.translationIntent?.status ?? '');
  const observingSyncStatus = Boolean(intentId) || searchIntentActive || translationIntentActive;
  useEffect(() => {
    if ((!terminal && !superseded) || !request || notified.current === request.generation) return;
    notified.current = request.generation;
    notifications.show(
      superseded
        ? {
            message:
              '더 최신 검색 동기화 의도가 이 예약을 대체하여 화면 대기를 종료했습니다. 최신 상태를 확인해 주세요.',
            color: 'blue',
          }
        : current?.status === 'completed'
          ? { message: '상품이 색인되었습니다.', color: 'teal' }
          : {
              message: current?.error ?? '검색 동기화가 완료되지 않았습니다. 다시 시도해 주세요.',
              color: 'red',
            }
    );
  }, [current, request, superseded, terminal]);
  useEffect(() => {
    if (terminal || superseded || !observingSyncStatus) return;
    let cancelled = false;
    let timer: number;
    const poll = async () => {
      const lookupGeneration = generation.current;
      try {
        const result = await refetch({ slug });
        if (
          !cancelled &&
          generation.current === lookupGeneration &&
          activeSlug.current === slug &&
          request?.generation === lookupGeneration
        )
          setObservation({
            generation: lookupGeneration,
            productId: result.data?.productContentSyncStatus.productId,
            status: result.data?.productContentSyncStatus.searchIntent,
          });
      } catch (failure) {
        if (!cancelled && generation.current === lookupGeneration && request?.generation === lookupGeneration)
          setObservation({
            generation: lookupGeneration,
            error: failure instanceof Error ? failure.message : '검색 동기화를 조회하지 못했습니다.',
          });
      }
      if (!cancelled) timer = window.setTimeout(() => void poll(), 1000);
    };
    timer = window.setTimeout(() => void poll(), 1000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [refetch, request, slug, superseded, terminal, observingSyncStatus]);
  const indexProduct = async () => {
    if (registering) return;
    const requestGeneration = ++generation.current;
    try {
      const result = await indexProductMutation({
        variables: { input: { slug } },
      });
      if (activeSlug.current !== slug || generation.current !== requestGeneration || !result.data) return;
      const { intentId: nextIntentId, productId, sourceRevision } = result.data.indexProduct;
      setRequest({
        slug,
        intentId: nextIntentId,
        productId,
        sourceRevision,
        generation: requestGeneration,
      });
      try {
        const fresh = await refetch({ slug });
        if (activeSlug.current === slug && generation.current === requestGeneration)
          setObservation({
            generation: requestGeneration,
            productId: fresh.data?.productContentSyncStatus.productId,
            status: fresh.data?.productContentSyncStatus.searchIntent,
          });
      } catch (lookupFailure) {
        if (activeSlug.current === slug && generation.current === requestGeneration) {
          setObservation({
            generation: requestGeneration,
            error: lookupFailure instanceof Error ? lookupFailure.message : '검색 동기화를 조회하지 못했습니다.',
          });
          notifications.show({
            message: lookupFailure instanceof Error ? lookupFailure.message : '검색 동기화를 조회하지 못했습니다.',
            color: 'red',
          });
        }
      }
      if (activeSlug.current !== slug || generation.current !== requestGeneration) return;
      notifications.show({
        message: '검색 동기화가 예약되었습니다.',
        color: 'blue',
      });
    } catch (failure) {
      if (activeSlug.current === slug && generation.current === requestGeneration)
        notifications.show({
          message: failure instanceof Error ? failure.message : '검색 동기화를 예약하지 못했습니다.',
          color: 'red',
        });
    }
  };
  const retrySync = async () => {
    const productId = syncStatus?.productId;
    if (!productId || activeSlug.current !== slug || activeProductId.current !== productId) return;
    const requestGeneration = ++generation.current;
    const retryIntent = superseded ? syncStatus?.searchIntent : undefined;
    const retryRequest =
      request?.slug === slug && request.productId === productId
        ? {
            ...request,
            intentId: retryIntent?.intentId ?? request.intentId,
            sourceRevision: retryIntent?.sourceRevision ?? request.sourceRevision,
            generation: requestGeneration,
          }
        : undefined;
    const isCurrentRequest = () =>
      activeSlug.current === slug && generation.current === requestGeneration && activeProductId.current === productId;
    try {
      if (!isCurrentRequest()) return;
      const result = await retrySyncMutation({ variables: { slug } });
      if (!isCurrentRequest() || result.data?.retryProductContentSync.productId !== productId) return;
      setObservation(undefined);
      if (retryRequest) setRequest(retryRequest);
      if (!isCurrentRequest()) return;
      const fresh = await refetch({ slug });
      if (!isCurrentRequest() || fresh.data?.productContentSyncStatus.productId !== productId) return;
      setObservation({
        generation: requestGeneration,
        productId: fresh.data.productContentSyncStatus.productId,
        status: fresh.data.productContentSyncStatus.searchIntent,
      });
      notifications.show({
        message: '실패한 최신 동기화 의도를 다시 예약했습니다. 번역 등록은 번역 완료가 아닙니다.',
        color: 'blue',
      });
    } catch (failure) {
      if (!isCurrentRequest()) return;
      if (retryRequest) setRequest(retryRequest);
      setObservation({
        generation: requestGeneration,
        error: failure instanceof Error ? failure.message : '동기화 재시도 실패',
      });
      notifications.show({
        message: failure instanceof Error ? failure.message : '동기화 재시도 실패',
        color: 'red',
      });
    }
  };
  return {
    syncStatus,
    retrySync,
    retrying,
    indexProduct,
    loading:
      registering ||
      Boolean(
        intentId && !superseded && !lookupError && (!current || ['pending', 'in_progress'].includes(current.status))
      ),
    error: lookupError ?? current?.error ?? undefined,
  };
}
