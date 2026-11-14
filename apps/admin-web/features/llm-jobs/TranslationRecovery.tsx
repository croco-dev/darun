'use client';

import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  TranslationFreshnessOnAdminRecoveryDocument,
  RequestTranslationOnAdminRecoveryDocument,
  RequestProductTranslationOnAdminRecoveryDocument,
  RetryTranslationOnAdminRecoveryDocument,
  TranslationJobOnAdminRecoveryDocument,
  ProductOnAdminTranslationRecoveryDocument,
} from '@darun/provider-graphql';
import { Button } from '@darun/ui';
import { useEffect, useState } from 'react';
import { refreshFreshnessQuery } from './useRefreshTranslationFreshness';

gql`
  query TranslationFreshnessOnAdminRecovery($entityType: String!, $entityId: String!, $fields: [String!]!) {
    translationFreshness(entityType: $entityType, entityId: $entityId, fields: $fields) {
      entityType
      entityId
      field
      status
    }
  }
  mutation RequestTranslationOnAdminRecovery($entityType: String!, $entityId: String!, $fields: [String!]!) {
    requestTranslation(entityType: $entityType, entityId: $entityId, fields: $fields) {
      id
      status
    }
  }
  mutation RequestProductTranslationOnAdminRecovery($productId: String!) {
    requestProductTranslation(productId: $productId) {
      id
      status
    }
  }
  mutation RetryTranslationOnAdminRecovery($id: String!) {
    retryTranslationJob(id: $id) {
      id
      status
    }
  }
  query TranslationJobOnAdminRecovery($id: String!) {
    translationJob(id: $id) {
      id
      status
      error
    }
  }
  query ProductOnAdminTranslationRecovery($slug: String!) {
    tempProductBySlug(slug: $slug) {
      id
    }
  }
`;

export function TranslationRecovery({
  entityType,
  entityId,
  fields,
}: {
  entityType: 'Product' | 'ProductFeature' | 'Magazine';
  entityId: string;
  fields: string[];
}) {
  const [request, setRequest] = useState<{ entityId: string; id: string }>();
  const [failure, setFailure] = useState<string>();
  const [requestTranslation, { loading: requesting }] = useMutation(RequestTranslationOnAdminRecoveryDocument);
  const [requestProduct, { loading: requestingProduct }] = useMutation(
    RequestProductTranslationOnAdminRecoveryDocument
  );
  const [retryTranslation, { loading: retrying }] = useMutation(RetryTranslationOnAdminRecoveryDocument);
  const freshness = useQuery(TranslationFreshnessOnAdminRecoveryDocument, {
    variables: { entityType, entityId, fields },
    fetchPolicy: 'no-cache',
    // A post-save refresh must not reuse a request started before the save.
    context: { queryDeduplication: false },
  });
  const id = request?.entityId === entityId ? request.id : undefined;
  const {
    data: jobData,
    error: jobError,
    startPolling,
    stopPolling,
  } = useQuery(TranslationJobOnAdminRecoveryDocument, {
    variables: { id: id ?? '' },
    skip: !id,
    fetchPolicy: 'network-only',
    pollInterval: 2000,
  });
  const fetchedJob = jobData?.translationJob;
  const currentJob = fetchedJob?.id === id ? fetchedJob : undefined;
  const active = Boolean(id && (!currentJob || ['pending', 'in_progress'].includes(currentJob.status)));
  useEffect(() => {
    if (!currentJob || ['pending', 'in_progress'].includes(currentJob.status)) return;
    stopPolling();
    if (currentJob.status === 'completed') void refreshFreshnessQuery(freshness.observable);
  }, [currentJob, stopPolling, freshness.observable]);
  const submit = async () => {
    setFailure(undefined);
    try {
      const result =
        currentJob?.status === 'failed'
          ? (await retryTranslation({ variables: { id: currentJob.id } })).data?.retryTranslationJob
          : entityType === 'Product'
            ? (await requestProduct({ variables: { productId: entityId } })).data?.requestProductTranslation
            : (await requestTranslation({ variables: { entityType, entityId, fields } })).data?.requestTranslation;
      if (!result) throw new Error('등록된 번역 작업을 확인하지 못했습니다.');
      setRequest({ entityId, id: result.id });
      startPolling(2000);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : '번역 요청 실패');
    }
  };
  return (
    <div className="min-w-0 space-y-1 text-xs text-dark-600">
      <div className="break-words" aria-live="polite">
        {freshness.loading && '번역 최신 여부 확인 중...'}
        {!freshness.loading &&
          !freshness.error &&
          freshness.data?.translationFreshness.map(row => `${row.field}: ${row.status}`).join(' / ')}
      </div>
      {freshness.error && <p role="alert">번역 상태를 확인하지 못했습니다.</p>}
      <div className="flex flex-wrap gap-1">
        <Button
          type="button"
          size="sm"
          variant="base"
          aria-disabled={freshness.loading}
          onClick={() => {
            if (!freshness.loading) void refreshFreshnessQuery(freshness.observable);
          }}
        >
          번역 상태 새로고침
        </Button>
        <Button
          type="button"
          size="sm"
          variant="base"
          disabled={requesting || requestingProduct || retrying || active}
          onClick={() => void submit()}
          aria-busy={active}
        >
          {active ? '영어 번역 진행 중...' : '영어 번역 재시도'}
        </Button>
      </div>
      {id && (
        <p className="break-all" aria-live="polite">
          등록된 번역 작업: {id} / {currentJob?.status ?? '조회 중'} (등록은 번역 완료가 아닙니다.)
        </p>
      )}
      {(failure || jobError || currentJob?.error) && (
        <p role="alert">{failure || jobError?.message || currentJob?.error}</p>
      )}
    </div>
  );
}

export function ProductTranslationRecovery({ slug }: { slug: string }) {
  const product = useQuery(ProductOnAdminTranslationRecoveryDocument, { variables: { slug } });
  if (product.error) return <p role="alert">{product.error.message}</p>;
  if (!product.data?.tempProductBySlug) return <p>제품 번역 확인 중...</p>;
  return (
    <TranslationRecovery
      entityType="Product"
      entityId={product.data.tempProductBySlug.id}
      fields={['name', 'summary', 'description', 'features']}
    />
  );
}
