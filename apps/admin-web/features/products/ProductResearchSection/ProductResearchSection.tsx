'use client';

import { gql } from '@apollo/client';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client/react';
import {
  PRODUCT_RESEARCH_FEATURE_SUMMARY_MAX_LENGTH,
  normalizeResearchFeatureSummary,
} from '@darun/products-domain/research';
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
import { useNavigate, useSearchParams } from '@darun/utils-router';
import { notifications } from '@mantine/notifications';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  listWorkspaceDrafts,
  readWorkspaceDraft,
  saveWorkspaceDraft,
  type ResearchWorkspaceDraft,
} from './researchWorkspaceDrafts';
import {
  createInitialWorkspaceReview,
  newRequestId,
  parseTagsInput,
  prefillReviewFromResult,
  resolveLogoUrlForMaterialize,
  shouldStopResearchPolling,
  type ResearchWorkspaceFeatureDraft,
  type ResearchWorkspaceReviewDraft,
  type ResearchWorkspacePersistedState,
  type WorkspaceImageSelection,
} from './researchWorkspaceState';

const REQUEST_PRODUCT_RESEARCH = gql`
  mutation RequestProductResearchWorkspace($input: RequestProductResearchInput!) {
    requestProductResearch(input: $input) {
      id
      officialUrl
      status
      errorCode
      errorMessage
    }
  }
`;

const RETRY_PRODUCT_RESEARCH = gql`
  mutation RetryProductResearchWorkspace($jobId: String!, $input: RetryProductResearchInput) {
    retryProductResearch(jobId: $jobId, input: $input) {
      id
      officialUrl
      status
      errorCode
      errorMessage
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
  requestProductResearch?: { id: string; officialUrl?: string };
};

type RetryResearchPayload = {
  retryProductResearch?: { id: string; officialUrl?: string } | null;
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
    officialUrlConfirmed: boolean;
    categoryIds: string[];
    features: { name: string; summary: string; emoji: string }[];
    tags: string[];
  };
};

const POLL_INTERVAL_MS = 3000;
const MAX_LOGO_SIZE = 5 * 1024 * 1024;

function readStoredWorkspace(targetJobId?: string | null): ResearchWorkspacePersistedState | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return readWorkspaceDraft(window.localStorage, window.sessionStorage, targetJobId);
  } catch {
    return null;
  }
}

export const ProductResearchSection = () => {
  const navigate = useNavigate();
  const researchJobIdParam = useSearchParams().get('researchJobId');
  const { upload } = useImageUpload();
  const [hydrated, setHydrated] = useState(false);
  const [restoreRequest, setRestoreRequest] = useState<ResearchWorkspaceDraft | null>(null);
  const appliedRestoreRequestRef = useRef<ResearchWorkspaceDraft | null>(null);
  const [activeDraft, setActiveDraft] = useState<{
    id: string;
    routeJobId: string | null;
    restoreRequest: ResearchWorkspaceDraft | null;
  } | null>(null);
  const [otherDrafts, setOtherDrafts] = useState<ResearchWorkspaceDraft[]>([]);
  const [draftStorageError, setDraftStorageError] = useState(false);
  const [saveAttempt, setSaveAttempt] = useState(0);
  const [requestId, setRequestId] = useState(() => newRequestId());
  const [officialUrl, setOfficialUrl] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [review, setReview] = useState<ResearchWorkspaceReviewDraft>(() => createInitialWorkspaceReview());
  const [tagsInput, setTagsInput] = useState<string | null>(null);
  const [logoSelection, setLogoSelection] = useState<WorkspaceImageSelection | null>(null);
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null);
  const [isMaterializing, setIsMaterializing] = useState(false);
  const materializePendingRef = useRef(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoInputKey, setLogoInputKey] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const [jobLookup, setJobLookup] = useState<{
    job?: ResearchJobPayload['productResearchJob'];
    loading: boolean;
    error?: { message: string };
  }>({ loading: false });
  // 최신 action 세대의 실패만 표시한다. 대체된 이전 action의 후착 오류는 화면에 남지 않는다.
  const [actionError, setActionError] = useState<{ message: string } | null>(null);
  const jobLookupSeqRef = useRef(0);
  const [materializedSlug, setMaterializedSlug] = useState<string | null>(null);
  const [officialUrlConfirmation, setOfficialUrlConfirmation] = useState<{ jobId: string; url: string } | null>(null);
  const isOfficialUrlConfirmed =
    officialUrlConfirmation?.jobId === jobId && officialUrlConfirmation?.url === review.officialUrl.trim();
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const jobIdRef = useRef<string | null>(null);
  // request/retry/등록/route가 함께 사용하는 단조 증가 action 세대다. 후착 응답은 이 세대가 최신일 때만 화면을 바꾼다.
  const requestSeqRef = useRef(0);
  const pendingRequestRef = useRef<{ id: string; url: string } | null>(null);
  const prefilledJobRef = useRef<string | null>(null);

  const setActiveJobId = useCallback((nextJobId: string | null) => {
    jobIdRef.current = nextJobId;
    jobLookupSeqRef.current += 1;
    setJobLookup({ loading: false });
    setJobId(nextJobId);
  }, []);

  const [requestResearch, { loading: isRequesting }] = useMutation<RequestResearchPayload, RequestResearchVariables>(
    REQUEST_PRODUCT_RESEARCH
  );
  const [retryResearch, { loading: isRetrying }] = useMutation<RetryResearchPayload, RetryResearchVariables>(
    RETRY_PRODUCT_RESEARCH
  );
  const [materialize] = useMutation<MaterializePayload, MaterializeVariables>(MATERIALIZE_RESEARCHED_PRODUCT);
  const [fetchJob] = useLazyQuery<ResearchJobPayload>(PRODUCT_RESEARCH_JOB, { fetchPolicy: 'network-only' });
  const { data: categoryData } = useQuery<{ categories?: CategoryOption[] }>(CATEGORIES, {
    variables: { first: 100, locale: 'ko' },
  });

  const job = jobLookup.job?.id === jobId ? jobLookup.job : null;
  const jobMissing = jobLookup.job === null;
  const jobLoading = jobLookup.loading;
  const result = job?.result ?? null;
  const featureSummaryErrors = review.features.map(feature => {
    const length = normalizeResearchFeatureSummary(feature.summary).length;
    return length > PRODUCT_RESEARCH_FEATURE_SUMMARY_MAX_LENGTH
      ? `현재 ${length}자, ${length - PRODUCT_RESEARCH_FEATURE_SUMMARY_MAX_LENGTH}자 초과입니다. ${PRODUCT_RESEARCH_FEATURE_SUMMARY_MAX_LENGTH}자 이내로 줄여 주세요.`
      : null;
  });
  const categories = useMemo(() => categoryData?.categories ?? [], [categoryData]);
  const mutationError = actionError ?? jobLookup.error ?? null;

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

  // 모든 조회 경로가 같은 job/요청/조회 순서 fence를 통과해야 현재 화면을 바꿀 수 있다.
  const loadJob = useCallback(
    async (targetJobId: string) => {
      if (jobIdRef.current !== targetJobId) return;
      const lookupSeq = ++jobLookupSeqRef.current;
      const requestSeq = requestSeqRef.current;
      const isCurrent = () =>
        jobIdRef.current === targetJobId &&
        jobLookupSeqRef.current === lookupSeq &&
        requestSeqRef.current === requestSeq;
      setJobLookup(previous => ({ ...previous, loading: true, error: undefined }));
      try {
        const response = await fetchJob({ variables: { id: targetJobId } });
        if (!isCurrent()) return;
        if (response.error) throw response.error;
        const payloadJob = response.data?.productResearchJob;
        if (payloadJob === undefined || (payloadJob && payloadJob.id !== targetJobId)) {
          setJobLookup(previous => ({ ...previous, loading: false }));
          return;
        }
        setJobLookup({ job: payloadJob, loading: false });
        if (payloadJob === null || shouldStopResearchPolling(payloadJob.status)) {
          stopPollingForJob(targetJobId);
        }
        return payloadJob;
      } catch (error) {
        if (isCurrent()) {
          setJobLookup(previous => ({
            ...previous,
            loading: false,
            error: { message: error instanceof Error ? error.message : '조사 작업 조회에 실패했습니다.' },
          }));
        }
      }
    },
    [fetchJob, stopPollingForJob]
  );

  const pollJob = useCallback(
    (targetJobId: string) => {
      if (jobIdRef.current !== targetJobId) return;
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
      if (document.visibilityState !== 'visible') {
        setIsPolling(false);
        return;
      }
      setIsPolling(true);
      pollTimer.current = setInterval(() => {
        if (document.visibilityState === 'visible') void loadJob(targetJobId);
      }, POLL_INTERVAL_MS);
    },
    [loadJob]
  );

  const restoredJobIdRef = useRef<string | null>(null);

  useEffect(() => {
    stopPolling();
    requestSeqRef.current += 1;
    setActionError(null);
    materializePendingRef.current = false;
    setIsMaterializing(false);
    pendingRequestRef.current = null;
    const requestedDraft = restoreRequest !== appliedRestoreRequestRef.current ? restoreRequest : null;
    appliedRestoreRequestRef.current = restoreRequest;
    const stored =
      requestedDraft && requestedDraft.workspace.jobId === (researchJobIdParam ?? jobIdRef.current)
        ? requestedDraft.workspace
        : readStoredWorkspace(researchJobIdParam);
    // 새 mount·복원마다 별도 writer를 쓴다. 복제 탭의 sessionStorage도 공유 writer를 만들지 않는다.
    setActiveDraft({
      id: newRequestId(),
      routeJobId: researchJobIdParam,
      restoreRequest,
    });

    setRequestId(stored?.requestId ?? newRequestId());
    setOfficialUrl(stored?.officialUrl ?? '');
    setReview(stored?.review ?? createInitialWorkspaceReview());
    setTagsInput(null);
    setUploadedLogoUrl(stored?.uploadedLogoUrl ?? null);
    setLogoSelection(stored?.review.logoUrl.trim() ? { kind: 'url', logoUrl: stored.review.logoUrl } : null);
    setLogoPreviewUrl(null);
    setLogoInputKey(key => key + 1);
    setOfficialUrlConfirmation(null);
    setMaterializedSlug(stored?.materializedSlug ?? null);
    const selectedJobId = researchJobIdParam ?? stored?.jobId ?? null;
    prefilledJobRef.current =
      stored?.prefilledJobId === selectedJobId || stored?.review.name || stored?.review.slug ? selectedJobId : null;
    setActiveJobId(selectedJobId);
    restoredJobIdRef.current = stored?.materializedSlug ? null : selectedJobId;
    setHydrated(true);
  }, [researchJobIdParam, restoreRequest, setActiveJobId, stopPolling]);

  useEffect(() => {
    const restoredJobId = restoredJobIdRef.current;
    if (!hydrated || !restoredJobId) {
      return;
    }
    restoredJobIdRef.current = null;
    jobIdRef.current = restoredJobId;
    void loadJob(restoredJobId).then(payloadJob => {
      if (payloadJob && !shouldStopResearchPolling(payloadJob.status)) pollJob(restoredJobId);
    });
  }, [hydrated, activeDraft, jobId, researchJobIdParam, loadJob, pollJob]);

  useEffect(() => {
    if (
      !hydrated ||
      !activeDraft ||
      activeDraft.routeJobId !== researchJobIdParam ||
      activeDraft.restoreRequest !== restoreRequest ||
      typeof window === 'undefined'
    ) {
      return;
    }
    const payload = {
      version: 1 as const,
      requestId,
      officialUrl,
      jobId,
      review,
      prefilledJobId: prefilledJobRef.current,
      logoFileName: logoSelection?.kind === 'file' ? logoSelection.fileName : null,
      uploadedLogoUrl,
      materializedSlug,
    };
    try {
      saveWorkspaceDraft(window.localStorage, window.sessionStorage, activeDraft.id, payload);
      setDraftStorageError(false);
    } catch {
      setDraftStorageError(true);
    }
  }, [
    hydrated,
    activeDraft,
    researchJobIdParam,
    restoreRequest,
    requestId,
    officialUrl,
    jobId,
    review,
    logoSelection,
    uploadedLogoUrl,
    materializedSlug,
    saveAttempt,
  ]);

  useEffect(() => {
    if (!activeDraft) return;
    const refreshDrafts = () => {
      try {
        setOtherDrafts(listWorkspaceDrafts(window.localStorage, jobId).filter(draft => draft.id !== activeDraft.id));
      } catch {
        setDraftStorageError(true);
      }
    };
    refreshDrafts();
    window.addEventListener('storage', refreshDrafts);
    window.addEventListener('focus', refreshDrafts);
    return () => {
      window.removeEventListener('storage', refreshDrafts);
      window.removeEventListener('focus', refreshDrafts);
    };
  }, [activeDraft, jobId]);

  useEffect(() => {
    return () => {
      // 다른 route로 떠난 화면도 후착 등록·로고 후처리의 권한을 잃는다.
      requestSeqRef.current += 1;
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        stopPolling();
      } else if (jobIdRef.current && !materializedSlug) {
        const target = jobIdRef.current;
        void loadJob(target).then(payloadJob => {
          if (payloadJob && !shouldStopResearchPolling(payloadJob.status)) pollJob(target);
        });
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [loadJob, materializedSlug, pollJob, stopPolling]);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
    };
  }, [logoPreviewUrl]);

  useEffect(() => {
    if (!result || materializedSlug) {
      return;
    }
    if (!jobId || job?.id !== jobId) {
      return;
    }
    if (prefilledJobRef.current === jobId) return;
    prefilledJobRef.current = jobId;
    setOfficialUrl(previous => previous || job?.officialUrl || '');

    setReview(previous => {
      const next = prefillReviewFromResult(previous, result, job?.officialUrl ?? officialUrl);
      return JSON.stringify(next) === JSON.stringify(previous) ? previous : next;
    });
  }, [result, job, jobId, officialUrl, materializedSlug]);

  const startNewRequestId = useCallback(() => {
    const next = newRequestId();
    setRequestId(next);
    return next;
  }, []);

  const resetWorkspaceForJob = useCallback(
    (nextJobId: string, nextOfficialUrl: string) => {
      stopPolling();
      setActiveJobId(nextJobId);
      prefilledJobRef.current = null;
      setOfficialUrlConfirmation(null);
      setOfficialUrl(nextOfficialUrl);
      setReview({ ...createInitialWorkspaceReview(nextOfficialUrl) });
      setTagsInput(null);
      setLogoSelection(null);
      setUploadedLogoUrl(null);
      setMaterializedSlug(null);
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl);
        setLogoPreviewUrl(null);
      }
      setLogoInputKey(key => key + 1);
    },
    [logoPreviewUrl, setActiveJobId, stopPolling]
  );

  const handleRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedUrl = officialUrl.trim();
    if (!trimmedUrl) {
      notifications.show({ message: '공식 사이트 URL을 입력해주세요.', color: 'red' });
      return;
    }
    const pendingRequest = pendingRequestRef.current;
    const activeRequestId = pendingRequest?.url === trimmedUrl ? pendingRequest.id : startNewRequestId();
    pendingRequestRef.current = { id: activeRequestId, url: trimmedUrl };
    // 연속 제출 경합에서 최신 제출만 Job·Review·poll 입력을 차지한다.
    // jobId state/closure는 제출 사이 렌더 이전에 갱신되지 않을 수 있어 제출 순서 판정에 쓸 수 없다.
    const submittedSeq = requestSeqRef.current + 1;
    requestSeqRef.current = submittedSeq;
    setActionError(null);
    materializePendingRef.current = false;
    setIsMaterializing(false);
    try {
      const response = await requestResearch({
        variables: { input: { requestId: activeRequestId, officialUrl: trimmedUrl } },
      });
      const nextJobId = response.data?.requestProductResearch?.id;
      if (!nextJobId) {
        return;
      }
      if (requestSeqRef.current !== submittedSeq) {
        return;
      }
      pendingRequestRef.current = null;
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
      const payloadJob = await loadJob(nextJobId);
      if (requestSeqRef.current !== submittedSeq) {
        return;
      }
      if (jobIdRef.current !== nextJobId) {
        return;
      }
      if (payloadJob && !shouldStopResearchPolling(payloadJob.status)) pollJob(nextJobId);
      navigate(`/products/new?researchJobId=${encodeURIComponent(nextJobId)}`, {
        replace: true,
        preventScrollReset: true,
      });
    } catch (error) {
      // 최신 action의 실제 실패만 표시하고 대체된 이전 요청의 후착 오류는 버린다. 입력은 그대로 둔다.
      if (requestSeqRef.current === submittedSeq) {
        setActionError({
          message: error instanceof Error && error.message ? error.message : '조사 요청에 실패했습니다.',
        });
      }
    }
  };

  const handleRetry = async () => {
    const retriedJobId = jobId;
    if (!retriedJobId) {
      return;
    }
    const retryRequestId = newRequestId();
    // 재조사도 request와 같은 action 세대를 사용한다. 새 action/route가 시작되면 이전 retry 응답은 화면을 바꾸지 못한다.
    const submittedSeq = requestSeqRef.current + 1;
    requestSeqRef.current = submittedSeq;
    setActionError(null);
    materializePendingRef.current = false;
    setIsMaterializing(false);
    // 재조사가 대체한 request의 키는 응답 순서·성공 여부와 무관하게 여기서 수명을 끝낸다.
    pendingRequestRef.current = null;
    try {
      const response = await retryResearch({
        variables: { jobId: retriedJobId, input: { requestId: retryRequestId } },
      });
      const payload = response.data?.retryProductResearch;
      const nextJobId = payload?.id;
      if (!nextJobId || requestSeqRef.current !== submittedSeq || jobIdRef.current !== retriedJobId) {
        return;
      }
      if (nextJobId !== retriedJobId) {
        setRequestId(retryRequestId);
        resetWorkspaceForJob(nextJobId, job?.officialUrl ?? officialUrl);
        const payloadJob = await loadJob(nextJobId);
        if (requestSeqRef.current !== submittedSeq || jobIdRef.current !== nextJobId) {
          return;
        }
        if (payloadJob && !shouldStopResearchPolling(payloadJob.status)) pollJob(nextJobId);
        navigate(`/products/new?researchJobId=${encodeURIComponent(nextJobId)}`, {
          replace: true,
          preventScrollReset: true,
        });
      } else {
        const payloadJob = await loadJob(nextJobId);
        if (requestSeqRef.current !== submittedSeq || jobIdRef.current !== nextJobId) {
          return;
        }
        if (payloadJob && !shouldStopResearchPolling(payloadJob.status)) pollJob(nextJobId);
      }
    } catch (error) {
      // 최신 action의 실제 실패만 표시하고 대체된 이전 재조사의 후착 오류는 버린다. 기존 Job 상태와 편집값을 유지한다.
      if (requestSeqRef.current === submittedSeq) {
        setActionError({
          message: error instanceof Error && error.message ? error.message : '재조사 요청에 실패했습니다.',
        });
      }
    }
  };

  const handleRefresh = useCallback(async () => {
    const refreshedJobId = jobIdRef.current ?? jobId;
    if (!refreshedJobId) {
      return;
    }
    const payloadJob = await loadJob(refreshedJobId);
    if (payloadJob && !shouldStopResearchPolling(payloadJob.status)) pollJob(refreshedJobId);
  }, [loadJob, jobId, pollJob]);

  const updateFeature = (index: number, patch: Partial<ResearchWorkspaceFeatureDraft>) => {
    if (materializePendingRef.current) return;
    setReview(previous => ({
      ...previous,
      features: previous.features.map((feature, featureIndex) =>
        featureIndex === index ? { ...feature, ...patch } : feature
      ),
    }));
  };

  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (materializePendingRef.current) return;
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

  const ensureUploadedLogo = useCallback(
    async (isCurrent: () => boolean) => {
      if (logoSelection?.kind === 'file') {
        if (uploadedLogoUrl) {
          return uploadedLogoUrl;
        }
        const slugSeed = review.slug.trim() || 'research-logo';
        try {
          const url = await upload('images/logos', logoSelection.file, slugSeed);
          if (!isCurrent()) return null;
          if (!url) return null;
          setUploadedLogoUrl(url);
          setReview(previous => ({ ...previous, logoUrl: url }));
          return url;
        } catch {
          if (isCurrent()) {
            notifications.show({ message: '로고 업로드에 실패했습니다. 다시 시도해주세요.', color: 'red' });
          }
          return null;
        }
      }
      if (logoSelection?.kind === 'url') {
        return logoSelection.logoUrl.trim() || null;
      }
      return resolveLogoUrlForMaterialize(null, uploadedLogoUrl);
    },
    [logoSelection, review.slug, upload, uploadedLogoUrl]
  );

  const handleMaterialize = async (event: React.FormEvent) => {
    event.preventDefault();
    if (materializePendingRef.current) return;
    if (featureSummaryErrors.some(Boolean)) {
      notifications.show({ message: '기능 설명의 초과 길이를 확인해 주세요.', color: 'red' });
      return;
    }
    if (!jobId || job?.id !== jobId || job?.status !== 'completed' || !result) {
      notifications.show({ message: '완료된 조사 결과에서만 서비스를 생성할 수 있습니다.', color: 'red' });
      return;
    }
    // 등록도 첫 로고 await 전에 이전 request/retry·조회의 화면 권한과 중복 전송 키 수명을 끝낸다.
    const submittedSeq = requestSeqRef.current + 1;
    requestSeqRef.current = submittedSeq;
    pendingRequestRef.current = null;
    // 대체된 조회의 응답 권한뿐 아니라 대기도 종료하되 현재 job·근거·편집값은 유지한다.
    setJobLookup(previous => ({ ...previous, loading: false }));
    const submittedJobId = jobId;
    const isCurrent = () => requestSeqRef.current === submittedSeq && jobIdRef.current === submittedJobId;
    setActionError(null);
    materializePendingRef.current = true;
    setIsMaterializing(true);
    try {
      const logoUrl = await ensureUploadedLogo(isCurrent);
      if (!isCurrent()) return;
      if (!logoUrl) {
        notifications.show({ message: '로고 파일을 올리거나 로고 URL을 직접 입력해주세요.', color: 'red' });
        return;
      }
      const response = await materialize({
        variables: {
          input: {
            researchJobId: submittedJobId,
            name: review.name.trim(),
            slug: review.slug.trim(),
            summary: review.summary.trim(),
            logoUrl,
            officialUrl: review.officialUrl.trim() || job.officialUrl,
            officialUrlConfirmed: isOfficialUrlConfirmed,
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
      if (!isCurrent()) return;
      const slug = response.data?.materializeResearchedProduct?.slug;
      if (slug) {
        notifications.show({
          message: job.materializedProductId ? '기존 서비스로 이동합니다.' : '미발행 서비스가 생성되었습니다.',
          color: 'teal',
        });
        setMaterializedSlug(slug);
        stopPolling();
        navigate(`/products/${encodeURIComponent(slug)}`);
      }
    } catch (error) {
      // 서버 등록·이력은 유지하고 최신 action의 실패만 입력을 보존한 채 표시한다.
      if (isCurrent()) {
        setActionError({
          message: error instanceof Error && error.message ? error.message : '검토 등록에 실패했습니다.',
        });
      }
    } finally {
      if (isCurrent()) {
        materializePendingRef.current = false;
        setIsMaterializing(false);
      }
    }
  };

  const toggleCategory = (categoryId: string) => {
    if (materializePendingRef.current) return;
    setReview(previous => ({
      ...previous,
      categoryIds: previous.categoryIds.includes(categoryId)
        ? previous.categoryIds.filter(id => id !== categoryId)
        : [...previous.categoryIds, categoryId],
    }));
  };

  // 회사/대안 후보는 근거(출처)를 함께 보여주는 읽기 전용 제안으로만 제공한다.
  const sourceByAnchor = (sourceId: string) => (result?.sources ?? []).find(source => source.id === sourceId);
  const evidenceOfCandidate = (candidate: { anchors?: Array<{ sourceId: string }> | null }) =>
    Array.from(new Set((candidate.anchors ?? []).map(anchor => sourceByAnchor(anchor.sourceId))))
      .filter((source): source is NonNullable<ReturnType<typeof sourceByAnchor>> => Boolean(source))
      .map(source => source.hostname);
  const companyCandidate = result?.companyCandidate
    ? {
        label: result.companyCandidate.name,
        hostnames: evidenceOfCandidate(result.companyCandidate),
      }
    : null;
  const alternativeCandidates = (result?.alternativeCandidates ?? [])
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate?.name))
    .map(candidate => ({
      label: `${candidate.name}${candidate.website ? ` (${candidate.website})` : ''}`,
      hostnames: evidenceOfCandidate(candidate),
    }));

  return (
    <AdminPanel>
      <AdminSectionHeader title="URL로 서비스 조사" />
      <AdminSectionBody>
        {draftStorageError && (
          <div role="alert" className="flex flex-col gap-2 text-sm text-cherry-700">
            <p>이 브라우저에 초안을 저장하지 못했습니다. 현재 입력은 유지되지만 새로고침하면 사라질 수 있습니다.</p>
            <Button type="button" variant="contained" color="secondary" onClick={() => setSaveAttempt(n => n + 1)}>
              초안 저장 다시 시도
            </Button>
          </div>
        )}
        {otherDrafts.length > 0 && (
          <details className="min-w-0 rounded-lg border border-dark-200 p-3">
            <summary className="cursor-pointer text-sm font-semibold">
              저장된 다른 편집본 ({otherDrafts.length}개)
            </summary>
            <p className="mt-2 text-xs text-dark-500" role="status">
              다른 탭의 변경은 현재 입력에 덮어쓰지 않습니다. 복원하면 현재 초안도 별도로 남습니다.
            </p>
            <ul className="mt-3 flex max-h-64 flex-col gap-3 overflow-auto">
              {otherDrafts.map(draft => (
                <li key={draft.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 flex-1 break-words text-sm">
                    <p>{draft.workspace.review.name || '이름 없는 초안'}</p>
                    <p className="text-xs text-dark-500">{draft.workspace.review.summary}</p>
                    <p className="text-xs text-dark-500">
                      {new Date(draft.updatedAt).toLocaleString('ko-KR', {
                        timeZone: 'Asia/Seoul',
                      })}{' '}
                      · {draft.id.slice(0, 8)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="contained"
                    color="secondary"
                    disabled={isRequesting || isRetrying || isMaterializing}
                    aria-label={`${draft.workspace.review.name || '이름 없는 초안'} 편집본 복원`}
                    onClick={() => setRestoreRequest({ ...draft })}
                  >
                    이 편집본 복원
                  </Button>
                </li>
              ))}
            </ul>
          </details>
        )}
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
            {job?.status ? ` · 상태: ${job.status}` : ''}
            {job?.errorMessage ? ` · ${job.errorMessage}` : ''}
          </p>
        )}

        {jobMissing && (
          <p role="status" className="text-xs text-amber-700">
            조사 작업을 찾을 수 없습니다. 자동 확인을 중단했습니다. 결과를 새로고침하거나 URL로 새 조사를 요청해주세요.
            아래 수동 등록도 계속 사용할 수 있습니다. 저장된 편집값은 유지됩니다.
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

            <form onSubmit={handleMaterialize} aria-busy={isMaterializing}>
              <fieldset disabled={isMaterializing} className="flex min-w-0 flex-col gap-3">
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
                      setOfficialUrlConfirmation(null);
                      setReview(previous => ({ ...previous, officialUrl: nextValue }));
                    }}
                  />
                </AdminField>
                {review.officialUrl.trim() !== result.originalUrl && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isOfficialUrlConfirmed}
                      onChange={event =>
                        setOfficialUrlConfirmation(
                          event.currentTarget.checked && jobId ? { jobId, url: review.officialUrl.trim() } : null
                        )
                      }
                    />
                    변경한 URL이 공식 사이트인지 직접 확인했습니다.
                  </label>
                )}

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
                    <AdminField
                      label={`기능 ${index + 1} 설명`}
                      help={`${PRODUCT_RESEARCH_FEATURE_SUMMARY_MAX_LENGTH}자 이내로 입력해 주세요.`}
                      error={featureSummaryErrors[index]}
                    >
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
                    value={tagsInput ?? review.tags.join(', ')}
                    onChange={event => {
                      const nextValue = event.currentTarget.value;
                      setTagsInput(nextValue);
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
                      disabled={isMaterializing}
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
                    disabled={isMaterializing}
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
                    disabled={isMaterializing}
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
                    disabled={isMaterializing || job?.status !== 'completed' || featureSummaryErrors.some(Boolean)}
                  >
                    {isMaterializing ? '생성 중...' : '검토 내용으로 미발행 생성'}
                  </Button>
                </AdminActions>
                <p className="text-xs text-dark-500">
                  생성된 서비스는 미발행 상태이며 자동 발행·색인·번역·Description이 실행되지 않습니다.
                </p>
              </fieldset>
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
              {companyCandidate && (
                <p className="text-xs text-dark-500">
                  회사 후보(읽기 전용 제안): {companyCandidate.label}
                  {companyCandidate.hostnames.length > 0 && ` · 근거: ${companyCandidate.hostnames.join(', ')}`}
                </p>
              )}
              {alternativeCandidates.length > 0 && (
                <p className="text-xs text-dark-500">
                  대안 후보(읽기 전용 제안):{' '}
                  {alternativeCandidates
                    .map(
                      candidate =>
                        `${candidate.label}${candidate.hostnames.length > 0 ? ` (근거: ${candidate.hostnames.join(', ')})` : ''}`
                    )
                    .join(', ')}
                </p>
              )}
            </div>
          </div>
        )}
      </AdminSectionBody>
    </AdminPanel>
  );
};
