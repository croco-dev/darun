'use client';

import { gql } from '@apollo/client';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client/react';
import { Button } from '@darun/ui';
import {
  AdminActions,
  AdminField,
  AdminInput,
  AdminPanel,
  AdminSectionBody,
  AdminSectionHeader,
  AdminTextarea,
} from '@darun/ui-admin';
import { useImageUpload } from '@darun/utils-image-upload';
import { useNavigate } from '@darun/utils-router';
import { notifications } from '@mantine/notifications';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RESEARCH_WORKSPACE_STORAGE_KEY,
  createInitialWorkspaceReview,
  newRequestId,
  parseTagsInput,
  parseWorkspaceState,
  prefillReviewFromResult,
  resolveLogoUrlForMaterialize,
  shouldStopResearchPolling,
  type ResearchWorkspaceFeatureDraft,
  type ResearchWorkspaceReviewDraft,
  type WorkspaceImageSelection,
} from './researchWorkspaceState';

const REQUEST_PRODUCT_RESEARCH = gql`
  mutation RequestProductResearchWorkspace($input: RequestProductResearchInput!) {
    requestProductResearch(input: $input) {
      dispatchStatus
      job {
        id
        officialUrl
        status
        errorCode
        errorMessage
      }
    }
  }
`;

const RETRY_PRODUCT_RESEARCH = gql`
  mutation RetryProductResearchWorkspace($jobId: String!, $input: RetryProductResearchInput) {
    retryProductResearch(jobId: $jobId, input: $input) {
      dispatchStatus
      job {
        id
        officialUrl
        status
        errorCode
        errorMessage
      }
    }
  }
`;

const PRODUCT_RESEARCH_JOB = gql`
  query ProductResearchJobWorkspace($id: String!) {
    productResearchJob(id: $id) {
      id
      status
      errorCode
      errorMessage
      officialUrl
      materializedProductId
      result {
        originalUrl
        name {
          value
          anchors {
            sourceId
            excerpt
          }
          evidenceType
        }
        suggestedSlug
        summary {
          value
          anchors {
            sourceId
            excerpt
          }
          evidenceType
        }
        features {
          name
          summary
          emoji
          anchors {
            sourceId
            excerpt
          }
          evidenceType
        }
        tags
        warnings
        sources {
          id
          title
          url
          hostname
          relationToInput
        }
        categoryCandidates {
          categoryId
          reason
        }
        companyCandidate {
          name
          website
          anchors {
            sourceId
            excerpt
          }
        }
        alternativeCandidates {
          name
          website
          anchors {
            sourceId
            excerpt
          }
        }
      }
    }
  }
`;

const CATEGORIES = gql`
  query CategoriesOnResearchWorkspace($first: Int!, $locale: String!) {
    categories(first: $first, locale: $locale) {
      id
      slug
      labelKo
      labelEn
    }
  }
`;

const MATERIALIZE_RESEARCHED_PRODUCT = gql`
  mutation MaterializeResearchedProductWorkspace($input: MaterializeResearchedProductInput!) {
    materializeResearchedProduct(input: $input) {
      id
      slug
      name
    }
  }
`;

type ResearchJobPayload = {
  productResearchJob?: {
    id: string;
    status: string;
    errorCode?: string | null;
    errorMessage?: string | null;
    officialUrl: string;
    materializedProductId?: string | null;
    result?: {
      originalUrl: string;
      name?: { value?: string; anchors?: { sourceId: string; excerpt: string }[]; evidenceType?: string } | null;
      suggestedSlug?: string;
      summary?: { value?: string; anchors?: { sourceId: string; excerpt: string }[]; evidenceType?: string } | null;
      features?: { name: string; summary: string; emoji: string; anchors?: { sourceId: string }[] }[] | null;
      tags?: string[] | null;
      warnings?: string[] | null;
      sources?: { id: string; title: string; url: string; hostname: string; relationToInput?: string }[] | null;
      categoryCandidates?: { categoryId?: string | null; reason?: string | null }[] | null;
      companyCandidate?: {
        name?: string | null;
        website?: string | null;
        anchors?: { sourceId: string; excerpt: string }[] | null;
      } | null;
      alternativeCandidates?:
        | ({
            name?: string | null;
            website?: string | null;
            anchors?: { sourceId: string; excerpt: string }[] | null;
          } | null)[]
        | null;
    } | null;
  } | null;
};

type CategoryOption = { id: string; slug: string; labelKo: string; labelEn: string };

type RequestResearchPayload = {
  requestProductResearch?: { dispatchStatus?: string; job?: { id: string; officialUrl?: string } };
};

type RetryResearchPayload = {
  retryProductResearch?: { dispatchStatus?: string; job?: { id: string; officialUrl?: string } } | null;
};

type MaterializePayload = {
  materializeResearchedProduct?: { id: string; slug: string; name: string };
};

type RequestResearchVariables = { input: { requestId: string; officialUrl: string } };
type RetryResearchVariables = { jobId: string; input?: { requestId?: string } };
type MaterializeVariables = {
  input: {
    researchJobId: string;
    name: string;
    slug: string;
    summary: string;
    logoUrl: string;
    officialUrl: string;
    categoryIds: string[];
    features: { name: string; summary: string; emoji: string }[];
    tags: string[];
  };
};

const POLL_INTERVAL_MS = 2500;
const MAX_LOGO_SIZE = 5 * 1024 * 1024;

function readStoredWorkspace(): ReturnType<typeof parseWorkspaceState> {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return parseWorkspaceState(window.localStorage.getItem(RESEARCH_WORKSPACE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export const ProductResearchSection = () => {
  const navigate = useNavigate();
  const { upload } = useImageUpload();
  const [hydrated, setHydrated] = useState(false);
  const [requestId, setRequestId] = useState(() => newRequestId());
  const [officialUrl, setOfficialUrl] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);
  const [review, setReview] = useState<ResearchWorkspaceReviewDraft>(() => createInitialWorkspaceReview());
  const [prefilledJobId, setPrefilledJobId] = useState<string | null>(null);
  const [logoSelection, setLogoSelection] = useState<WorkspaceImageSelection | null>(null);
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoInputKey, setLogoInputKey] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const [materializedSlug, setMaterializedSlug] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const jobIdRef = useRef<string | null>(null);
  // 동일 폼 연속 제출 경합에서 최신 제출만 적용하기 위한 단조 증가 일련번호다.
  const requestSeqRef = useRef(0);

  const setActiveJobId = useCallback((nextJobId: string | null) => {
    jobIdRef.current = nextJobId;
    setJobId(nextJobId);
  }, []);

  const [requestResearch, { loading: isRequesting, error: requestError }] = useMutation<
    RequestResearchPayload,
    RequestResearchVariables
  >(REQUEST_PRODUCT_RESEARCH);
  const [retryResearch, { loading: isRetrying, error: retryError }] = useMutation<
    RetryResearchPayload,
    RetryResearchVariables
  >(RETRY_PRODUCT_RESEARCH);
  const [materialize, { loading: isMaterializing, error: materializeError }] = useMutation<
    MaterializePayload,
    MaterializeVariables
  >(MATERIALIZE_RESEARCHED_PRODUCT);
  const [fetchJob, { data: jobData, loading: jobLoading, error: jobError }] = useLazyQuery<ResearchJobPayload>(
    PRODUCT_RESEARCH_JOB,
    { fetchPolicy: 'network-only' }
  );
  const { data: categoryData } = useQuery<{ categories?: CategoryOption[] }>(CATEGORIES, {
    variables: { first: 100, locale: 'ko' },
  });

  const queriedJob = jobData?.productResearchJob ?? null;
  // useLazyQuery 캐시는 jobId 전환 직후 이전 Job을 잠시 반환할 수 있다.
  // jobId와 일치하는 응답만 현재 Job·Review·materialize 입력으로 사용한다.
  const job = queriedJob && queriedJob.id === jobId ? queriedJob : null;
  const result = job?.result ?? null;
  const categories = useMemo(() => categoryData?.categories ?? [], [categoryData]);
  const mutationError = requestError ?? retryError ?? materializeError ?? jobError ?? null;

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
    setIsPolling(false);
  }, []);

  const stopPollingForJob = useCallback(
    (targetJobId: string) => {
      if (jobIdRef.current !== targetJobId) {
        return;
      }
      stopPolling();
    },
    [stopPolling]
  );

  const pollJob = useCallback(
    (targetJobId: string) => {
      jobIdRef.current = targetJobId;
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
      setIsPolling(true);
      pollTimer.current = setInterval(async () => {
        try {
          const response = await fetchJob({ variables: { id: targetJobId } });
          if (jobIdRef.current !== targetJobId) {
            return;
          }
          const payloadJob = response.data?.productResearchJob;
          if (!payloadJob || payloadJob.id !== targetJobId) {
            return;
          }
          if (shouldStopResearchPolling(payloadJob.status)) {
            stopPollingForJob(targetJobId);
          }
        } catch {
          // 폴링 실패는 다음 틱에서 재시도한다.
        }
      }, POLL_INTERVAL_MS);
    },
    [fetchJob, stopPollingForJob]
  );

  const restoredJobIdRef = useRef<string | null>(null);

  useEffect(() => {
    const stored = readStoredWorkspace();
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 새로고침 복구 시 저장된 워크스페이스 초기화에 필요
      setRequestId(stored.requestId);
      setOfficialUrl(stored.officialUrl);
      setActiveJobId(stored.jobId);
      setDispatchStatus(stored.dispatchStatus);
      setReview(stored.review);
      setPrefilledJobId(stored.prefilledJobId);
      setUploadedLogoUrl(stored.uploadedLogoUrl);
      if (stored.review.logoUrl.trim()) {
        setLogoSelection({ kind: 'url', logoUrl: stored.review.logoUrl });
      }
      setMaterializedSlug(stored.materializedSlug);
      if (stored.jobId && !stored.materializedSlug) {
        restoredJobIdRef.current = stored.jobId;
      }
    }
    setHydrated(true);
  }, [setActiveJobId]);

  useEffect(() => {
    const restoredJobId = restoredJobIdRef.current;
    if (!hydrated || !restoredJobId) {
      return;
    }
    restoredJobIdRef.current = null;
    jobIdRef.current = restoredJobId;
    void (async () => {
      try {
        const response = await fetchJob({ variables: { id: restoredJobId } });
        if (jobIdRef.current !== restoredJobId) {
          return;
        }
        const payloadJob = response.data?.productResearchJob;
        if (payloadJob && payloadJob.id !== restoredJobId) {
          return;
        }
        const status = payloadJob?.status;
        if (!shouldStopResearchPolling(status)) {
          pollJob(restoredJobId);
        }
      } catch {
        // 복구 조회 실패는 에러 상태로 표시하고 수동 새로고침을 유도한다.
      }
    })();
  }, [hydrated, fetchJob, pollJob]);

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') {
      return;
    }
    const payload = {
      version: 1 as const,
      requestId,
      officialUrl,
      jobId,
      dispatchStatus,
      review,
      prefilledJobId,
      logoFileName: logoSelection?.kind === 'file' ? logoSelection.fileName : null,
      uploadedLogoUrl,
      materializedSlug,
    };
    try {
      window.localStorage.setItem(RESEARCH_WORKSPACE_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // 저장 실패는 작업 흐름을 막지 않는다.
    }
  }, [
    hydrated,
    requestId,
    officialUrl,
    jobId,
    dispatchStatus,
    review,
    prefilledJobId,
    logoSelection,
    uploadedLogoUrl,
    materializedSlug,
  ]);

  useEffect(() => {
    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
    };
  }, [logoPreviewUrl]);

  useEffect(() => {
    if (!job?.status || materializedSlug) {
      return;
    }
    if (job.id !== jobId) {
      return;
    }
    if (shouldStopResearchPolling(job.status)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 완료 Job 수신 시 폴링 타이머 정리에 필요
      stopPolling();
    }
  }, [job, jobId, materializedSlug, stopPolling]);

  useEffect(() => {
    if (!result || materializedSlug) {
      return;
    }
    if (!jobId || job?.id !== jobId || prefilledJobId === jobId) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 조사 결과 수신 시 Review 초안 prefill에 필요
    setReview(previous => {
      const next = prefillReviewFromResult(previous, result, job?.officialUrl ?? officialUrl, prefilledJobId === jobId);
      return JSON.stringify(next) === JSON.stringify(previous) ? previous : next;
    });
    setPrefilledJobId(jobId);
  }, [result, job, jobId, officialUrl, materializedSlug, prefilledJobId]);

  const startNewRequestId = useCallback(() => {
    const next = newRequestId();
    setRequestId(next);
    return next;
  }, []);

  const resetWorkspaceForJob = useCallback(
    (nextJobId: string, nextOfficialUrl: string) => {
      setActiveJobId(nextJobId);
      setOfficialUrl(nextOfficialUrl);
      setReview({ ...createInitialWorkspaceReview(nextOfficialUrl) });
      setPrefilledJobId(null);
      setLogoSelection(null);
      setUploadedLogoUrl(null);
      setMaterializedSlug(null);
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl);
        setLogoPreviewUrl(null);
      }
      setLogoInputKey(key => key + 1);
    },
    [logoPreviewUrl, setActiveJobId]
  );

  const handleRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedUrl = officialUrl.trim();
    if (!trimmedUrl) {
      notifications.show({ message: '공식 사이트 URL을 입력해주세요.', color: 'red' });
      return;
    }
    const sameAsCurrentJob = Boolean(jobId && job?.officialUrl && trimmedUrl === job.officialUrl);
    const activeRequestId = sameAsCurrentJob ? requestId : startNewRequestId();
    // 연속 제출 경합에서 최신 제출만 Job·Review·poll 입력을 차지한다.
    // jobId state/closure는 제출 사이 렌더 이전에 갱신되지 않을 수 있어 제출 순서 판정에 쓸 수 없다.
    const submittedSeq = requestSeqRef.current + 1;
    requestSeqRef.current = submittedSeq;
    try {
      const response = await requestResearch({
        variables: { input: { requestId: activeRequestId, officialUrl: trimmedUrl } },
      });
      const payload = response.data?.requestProductResearch;
      const nextJobId = payload?.job?.id;
      if (!nextJobId) {
        return;
      }
      if (requestSeqRef.current !== submittedSeq) {
        return;
      }
      if (payload?.dispatchStatus) {
        setDispatchStatus(payload.dispatchStatus);
      }
      if (nextJobId) {
        const requestedJobId = jobId;
        const switchedJob = nextJobId !== requestedJobId;
        if (switchedJob) {
          resetWorkspaceForJob(nextJobId, trimmedUrl);
        } else {
          setActiveJobId(nextJobId);
          setOfficialUrl(trimmedUrl);
          setReview(previous => ({ ...previous, officialUrl: trimmedUrl }));
          setMaterializedSlug(null);
        }
        const fetched = await fetchJob({ variables: { id: nextJobId } });
        if (requestSeqRef.current !== submittedSeq) {
          return;
        }
        if (jobIdRef.current !== nextJobId) {
          return;
        }
        if (fetched.data?.productResearchJob && fetched.data.productResearchJob.id !== nextJobId) {
          return;
        }
        pollJob(nextJobId);
        if (payload?.dispatchStatus === 'RETRY_REQUIRED') {
          notifications.show({
            message: '조사 작업은 저장됐지만 전송이 지연되고 있습니다. 결과 새로고침으로 확인해주세요.',
            color: 'yellow',
          });
        }
      }
    } catch {
      // useMutation error 상태로 표시하며 입력은 그대로 둔다.
    }
  };

  const handleRetry = async () => {
    const retriedJobId = jobId;
    if (!retriedJobId) {
      return;
    }
    const retryRequestId = newRequestId();
    try {
      const response = await retryResearch({
        variables: { jobId: retriedJobId, input: { requestId: retryRequestId } },
      });
      const payload = response.data?.retryProductResearch;
      const nextJobId = payload?.job?.id;
      if (!nextJobId || jobIdRef.current !== retriedJobId) {
        return;
      }
      if (payload?.dispatchStatus) {
        setDispatchStatus(payload.dispatchStatus);
      }
      if (nextJobId !== retriedJobId) {
        setRequestId(retryRequestId);
        resetWorkspaceForJob(nextJobId, job?.officialUrl ?? officialUrl);
        const fetched = await fetchJob({ variables: { id: nextJobId } });
        if (jobIdRef.current !== nextJobId) {
          return;
        }
        if (fetched.data?.productResearchJob && fetched.data.productResearchJob.id !== nextJobId) {
          return;
        }
        pollJob(nextJobId);
      } else {
        await fetchJob({ variables: { id: nextJobId } });
      }
    } catch {
      // 실패해도 기존 Job 상태와 편집값을 유지한다.
    }
  };

  const handleRefresh = useCallback(async () => {
    const refreshedJobId = jobIdRef.current ?? jobId;
    if (!refreshedJobId) {
      return;
    }
    try {
      const response = await fetchJob({ variables: { id: refreshedJobId } });
      if (jobIdRef.current !== refreshedJobId) {
        return;
      }
      if (response.data?.productResearchJob && response.data.productResearchJob.id !== refreshedJobId) {
        return;
      }
      if (shouldStopResearchPolling(response.data?.productResearchJob?.status)) {
        stopPollingForJob(refreshedJobId);
      }
    } catch {
      // 조회 실패는 에러 상태로 표시한다.
    }
  }, [fetchJob, jobId, stopPollingForJob]);

  const updateFeature = (index: number, patch: Partial<ResearchWorkspaceFeatureDraft>) => {
    setReview(previous => ({
      ...previous,
      features: previous.features.map((feature, featureIndex) =>
        featureIndex === index ? { ...feature, ...patch } : feature
      ),
    }));
  };

  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      notifications.show({ message: '이미지 파일(PNG, JPEG, WebP)만 업로드할 수 있습니다.', color: 'red' });
      event.currentTarget.value = '';
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      notifications.show({ message: '로고 이미지는 5MB 이하만 업로드할 수 있습니다.', color: 'red' });
      event.currentTarget.value = '';
      return;
    }
    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
    }
    setLogoPreviewUrl(URL.createObjectURL(file));
    setLogoSelection({ kind: 'file', file, fileName: file.name });
    setUploadedLogoUrl(null);
  };

  const ensureUploadedLogo = useCallback(async () => {
    if (logoSelection?.kind === 'file') {
      if (uploadedLogoUrl) {
        return uploadedLogoUrl;
      }
      const slugSeed = review.slug.trim() || 'research-logo';
      setIsUploadingLogo(true);
      try {
        const url = await upload('images/logos', logoSelection.file, slugSeed);
        if (!url) {
          return null;
        }
        setUploadedLogoUrl(url);
        setReview(previous => ({ ...previous, logoUrl: url }));
        return url;
      } catch {
        notifications.show({ message: '로고 업로드에 실패했습니다. 다시 시도해주세요.', color: 'red' });
        return null;
      } finally {
        setIsUploadingLogo(false);
      }
    }
    if (logoSelection?.kind === 'url') {
      return logoSelection.logoUrl.trim() || null;
    }
    return resolveLogoUrlForMaterialize(null, uploadedLogoUrl);
  }, [logoSelection, review.slug, upload, uploadedLogoUrl]);

  const handleMaterialize = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!jobId || job?.id !== jobId || job?.status !== 'completed' || !result) {
      notifications.show({ message: '완료된 조사 결과에서만 서비스를 생성할 수 있습니다.', color: 'red' });
      return;
    }
    if (job.materializedProductId) {
      notifications.show({ message: '이미 생성된 조사 작업입니다.', color: 'yellow' });
      return;
    }
    const logoUrl = await ensureUploadedLogo();
    if (!logoUrl) {
      notifications.show({ message: '로고 파일을 올리거나 로고 URL을 직접 입력해주세요.', color: 'red' });
      return;
    }
    try {
      const response = await materialize({
        variables: {
          input: {
            researchJobId: jobId,
            name: review.name.trim(),
            slug: review.slug.trim(),
            summary: review.summary.trim(),
            logoUrl,
            officialUrl: review.officialUrl.trim() || job.officialUrl,
            categoryIds: review.categoryIds,
            features: review.features.map(feature => ({
              name: feature.name.trim(),
              summary: feature.summary.trim(),
              emoji: feature.emoji.trim() || '✨',
            })),
            tags: review.tags,
          },
        },
      });
      const slug = response.data?.materializeResearchedProduct?.slug;
      if (slug) {
        notifications.show({ message: '미발행 서비스가 생성되었습니다.', color: 'teal' });
        setMaterializedSlug(slug);
        stopPolling();
        navigate(`/products/${encodeURIComponent(slug)}`);
      }
    } catch {
      // 입력값은 그대로 유지하고 에러 메시지로 안내한다.
    }
  };

  const toggleCategory = (categoryId: string) => {
    setReview(previous => ({
      ...previous,
      categoryIds: previous.categoryIds.includes(categoryId)
        ? previous.categoryIds.filter(id => id !== categoryId)
        : [...previous.categoryIds, categoryId],
    }));
  };

  const companyCandidate = result?.companyCandidate?.name;
  const alternativeCandidates = (result?.alternativeCandidates ?? [])
    .map(candidate => (candidate?.name ? `${candidate.name}${candidate.website ? ` (${candidate.website})` : ''}` : ''))
    .filter((name): name is string => Boolean(name));

  return (
    <AdminPanel>
      <AdminSectionHeader title="URL로 서비스 조사" />
      <AdminSectionBody>
        <form onSubmit={handleRequest} className="flex flex-col gap-3">
          <AdminField label="공식 사이트 URL" error={mutationError?.message}>
            <AdminInput
              name="officialUrl"
              value={officialUrl}
              onChange={event => setOfficialUrl(event.currentTarget.value)}
              placeholder="ex) https://linear.app"
              disabled={isRequesting}
            />
          </AdminField>
          <AdminActions>
            <Button type="submit" variant="contained" color="primary" disabled={isRequesting || !officialUrl.trim()}>
              {isRequesting ? '조사 요청 중...' : '조사 요청'}
            </Button>
            {jobId && (
              <Button
                type="button"
                variant="contained"
                color="secondary"
                disabled={jobLoading || isPolling}
                onClick={handleRefresh}
              >
                {jobLoading ? '새로고침 중...' : isPolling ? '자동 확인 중...' : '결과 새로고침'}
              </Button>
            )}
            {job?.status === 'failed' && (
              <Button type="button" variant="contained" color="secondary" disabled={isRetrying} onClick={handleRetry}>
                {isRetrying ? '재조사 요청 중...' : '실패 작업 재조사'}
              </Button>
            )}
          </AdminActions>
        </form>

        {jobId && (
          <p className="text-xs text-dark-500">
            작업 ID: {jobId}
            {dispatchStatus ? ` · 전송 상태: ${dispatchStatus}` : ''}
            {job?.status ? ` · 상태: ${job.status}` : ''}
            {job?.errorMessage ? ` · ${job.errorMessage}` : ''}
          </p>
        )}

        {job?.status === 'failed' && (
          <p className="text-xs text-cherry-700">
            조사가 실패했습니다. 기존 실패 작업은 그대로 두고 새 작업으로만 재조사합니다.
          </p>
        )}

        {result && (
          <div className="flex flex-col gap-3 rounded-lg border border-dark-200 p-3">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold">{result.name?.value}</p>
              {result.summary?.value && <p className="text-sm text-dark-600">{result.summary.value}</p>}
              <p className="text-xs text-dark-500">제안 slug: {result.suggestedSlug}</p>
              {(result.warnings?.length ?? 0) > 0 && (
                <p className="text-xs text-amber-700">주의: {(result.warnings ?? []).join(', ')}</p>
              )}
            </div>

            <form onSubmit={handleMaterialize} className="flex flex-col gap-3">
              <AdminField label="서비스 이름">
                <AdminInput
                  name="review-name"
                  value={review.name}
                  onChange={event => {
                    const nextValue = event.currentTarget.value;
                    setReview(previous => ({ ...previous, name: nextValue }));
                  }}
                />
              </AdminField>
              <AdminField label="slug">
                <AdminInput
                  name="review-slug"
                  value={review.slug}
                  onChange={event => {
                    const nextValue = event.currentTarget.value;
                    setReview(previous => ({ ...previous, slug: nextValue }));
                  }}
                />
              </AdminField>
              <AdminField label="요약">
                <AdminTextarea
                  name="review-summary"
                  rows={4}
                  value={review.summary}
                  onChange={event => {
                    const nextValue = event.currentTarget.value;
                    setReview(previous => ({ ...previous, summary: nextValue }));
                  }}
                />
              </AdminField>
              <AdminField label="공식 URL">
                <AdminInput
                  name="review-official-url"
                  value={review.officialUrl}
                  onChange={event => {
                    const nextValue = event.currentTarget.value;
                    setReview(previous => ({ ...previous, officialUrl: nextValue }));
                  }}
                />
              </AdminField>

              <AdminField label="카테고리 (선택, 비워둘 수 있음)">
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <label key={category.id} className="flex items-center gap-1 text-xs text-dark-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={review.categoryIds.includes(category.id)}
                        onChange={() => toggleCategory(category.id)}
                      />
                      {category.labelKo}
                    </label>
                  ))}
                  {categories.length === 0 && (
                    <span className="text-xs text-dark-500">카테고리를 불러오는 중이거나 비어 있습니다.</span>
                  )}
                </div>
              </AdminField>

              {review.features.map((feature, index) => (
                <div key={`feature-${index}`} className="flex flex-col gap-2 rounded-lg bg-black/[0.02] p-2">
                  <AdminField label={`기능 ${index + 1} 이름`}>
                    <AdminInput
                      value={feature.name}
                      onChange={event => {
                        const nextValue = event.currentTarget.value;
                        updateFeature(index, { name: nextValue });
                      }}
                    />
                  </AdminField>
                  <AdminField label={`기능 ${index + 1} 설명`}>
                    <AdminTextarea
                      rows={3}
                      value={feature.summary}
                      onChange={event => {
                        const nextValue = event.currentTarget.value;
                        updateFeature(index, { summary: nextValue });
                      }}
                    />
                  </AdminField>
                  <AdminField label={`기능 ${index + 1} 이모지`}>
                    <AdminInput
                      value={feature.emoji}
                      maxLength={30}
                      onChange={event => {
                        const nextValue = event.currentTarget.value;
                        updateFeature(index, { emoji: nextValue });
                      }}
                    />
                  </AdminField>
                </div>
              ))}

              <AdminField label="태그 (쉼표 구분)">
                <AdminInput
                  name="review-tags"
                  value={review.tags.join(', ')}
                  onChange={event => {
                    const nextValue = event.currentTarget.value;
                    setReview(previous => ({ ...previous, tags: parseTagsInput(nextValue) }));
                  }}
                  placeholder="ex) 협업, 생산성"
                />
              </AdminField>

              <AdminField label="로고 파일 (Cloudinary 고유 public_id로 업로드)">
                <div className="flex flex-col gap-2">
                  <AdminInput
                    key={logoInputKey}
                    name="review-logo-file"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={isUploadingLogo || isMaterializing}
                    onChange={handleLogoFileChange}
                  />
                  {logoPreviewUrl && (
                    <div className="flex items-center gap-3">
                      <img
                        src={logoPreviewUrl}
                        alt="조사 로고 미리보기"
                        className="h-12 w-12 rounded-lg border border-dark-200 bg-white object-contain p-1"
                      />
                      <span className="text-xs text-dark-500">
                        {logoSelection?.kind === 'file' ? logoSelection.fileName : '선택된 로고 미리보기'}
                      </span>
                    </div>
                  )}
                  {uploadedLogoUrl && <span className="text-xs text-dark-500">업로드 완료: {uploadedLogoUrl}</span>}
                </div>
              </AdminField>
              <AdminField label="또는 로고 URL 직접 입력">
                <AdminInput
                  name="review-logo-url"
                  value={review.logoUrl}
                  placeholder="https://..."
                  onChange={event => {
                    const nextUrl = event.currentTarget.value;
                    setReview(previous => ({ ...previous, logoUrl: nextUrl }));
                    setLogoSelection(nextUrl.trim() ? { kind: 'url', logoUrl: nextUrl } : null);
                  }}
                />
              </AdminField>

              <AdminActions>
                <Button
                  type="button"
                  variant="contained"
                  color="secondary"
                  disabled={isUploadingLogo || isMaterializing}
                  onClick={() => {
                    setLogoSelection(null);
                    setUploadedLogoUrl(null);
                    if (logoPreviewUrl) {
                      URL.revokeObjectURL(logoPreviewUrl);
                      setLogoPreviewUrl(null);
                    }
                    setLogoInputKey(key => key + 1);
                  }}
                >
                  로고 선택 취소
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={isMaterializing || isUploadingLogo || job?.status !== 'completed'}
                >
                  {isMaterializing || isUploadingLogo ? '생성 중...' : '검토 내용으로 미발행 생성'}
                </Button>
              </AdminActions>
              <p className="text-xs text-dark-500">
                생성된 서비스는 미발행 상태이며 자동 발행·색인·번역·Description이 실행되지 않습니다.
              </p>
            </form>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-dark-700">근거 출처</p>
              <ul className="list-disc pl-5 text-xs text-dark-600">
                {(result.sources ?? []).map(source => (
                  <li key={source.id}>
                    <a href={source.url} target="_blank" rel="noreferrer" className="underline">
                      {source.title}
                    </a>{' '}
                    <span className="text-dark-500">
                      ({source.hostname} · {source.relationToInput ?? 'EXTERNAL'})
                    </span>
                  </li>
                ))}
              </ul>
              {companyCandidate && <p className="text-xs text-dark-500">회사 후보(참고용): {companyCandidate}</p>}
              {alternativeCandidates.length > 0 && (
                <p className="text-xs text-dark-500">대안 후보(참고용): {alternativeCandidates.join(', ')}</p>
              )}
            </div>
          </div>
        )}
      </AdminSectionBody>
    </AdminPanel>
  );
};
