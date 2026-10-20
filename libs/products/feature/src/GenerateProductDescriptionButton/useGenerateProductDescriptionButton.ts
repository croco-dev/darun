'use client';

import { gql } from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useApolloClient, useLazyQuery, useMutation } from '@apollo/client/react';
import {
  ApplyProductDescriptionCandidateDocument,
  GenerateProductDescriptionDocument,
  GetProductDescriptionJobDocument,
  TempProductBySlugOnEditProductDescriptionDocument,
  TempProductBySlugOnProductDescriptionDocument,
} from '@darun/provider-graphql';
import { notifications } from '@mantine/notifications';
import { useEffect, useRef, useState } from 'react';

gql(`
  mutation GenerateProductDescription($input: GenerateProductDescriptionInput!) {
    generateProductDescription(input: $input) {
      product {
        id
        name
        description
      }
      job {
        id
        productId
        status
        message
        candidateHtml
        appliedAt
      }
    }
  }

  mutation ApplyProductDescriptionCandidate($jobId: String!) {
    applyProductDescriptionCandidate(jobId: $jobId) {
      alreadyApplied
      product {
        id
        name
        description
      }
      job {
        id
        productId
        status
        message
        appliedAt
      }
    }
  }

  query GetProductDescriptionJob($id: String!, $slug: String!) {
    tempProductBySlug(slug: $slug) { id }
    productDescriptionJob(id: $id) {
      id
      productId
      status
      message
      error
      candidateHtml
      appliedAt
    }
  }
`);

const CLIENT_TIMEOUT_MS = 25_000;
const POLL_INTERVAL_MS = 2_000;
const MAX_POLL_TIMEOUT_MS = 180_000;
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface CandidateJobInfo {
  id: string;
  productId?: string | null;
  status?: string | null;
  appliedAt?: string | null;
  candidateHtml?: string | null;
  message?: string | null;
}

export function useGenerateProductDescriptionButton(
  slug: string,
  descriptionJobId?: string,
  onJobChange?: (id: string) => void
) {
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [candidateJob, setCandidateJob] = useState<CandidateJobInfo | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [jobIdInput, setJobIdInput] = useState('');
  const [reopening, setReopening] = useState(false);
  const [staleApplyNotice, setStaleApplyNotice] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);
  const isApplyingRef = useRef(false);
  const applyRequestRef = useRef(0);
  const generateRequestRef = useRef(0);
  const generateBaseAddressRef = useRef<{ jobId?: string; slug: string } | null>(null);
  const reopenRequestRef = useRef(0);
  const apolloClient = useApolloClient();
  const [generateDescriptionMutation] = useMutation(GenerateProductDescriptionDocument);
  const [applyCandidateMutation] = useMutation(ApplyProductDescriptionCandidateDocument);
  const [getProductDescriptionJob] = useLazyQuery(GetProductDescriptionJobDocument, {
    fetchPolicy: 'network-only',
  });

  const refetchProductQueries = async () => {
    try {
      await apolloClient.refetchQueries({
        include: [TempProductBySlugOnEditProductDescriptionDocument, TempProductBySlugOnProductDescriptionDocument],
      });
    } catch (refetchErr) {
      console.warn('[useGenerateProductDescriptionButton] Refetch queries failed:', refetchErr);
    }
  };

  const openPreview = () => setIsPreviewOpen(true);
  const closePreview = () => setIsPreviewOpen(false);

  const setCandidateFromJob = (job: {
    id: string;
    productId?: string | null;
    status?: string | null;
    appliedAt?: string | null;
    candidateHtml?: string | null;
    message?: string | null;
  }) => {
    setCandidateJob({
      id: job.id,
      productId: job.productId ?? null,
      status: job.status ?? null,
      appliedAt: job.appliedAt ?? null,
      candidateHtml: job.candidateHtml,
      message: job.message,
    });
  };

  const handleReopenJob = async () => {
    const id = jobIdInput.trim();
    if (!id || reopening || isSubmittingRef.current) return;
    applyRequestRef.current += 1;
    isApplyingRef.current = false;
    setApplying(false);
    const requestId = ++reopenRequestRef.current;
    try {
      setReopening(true);
      setStaleApplyNotice(null);
      const queryRes = await getProductDescriptionJob({ variables: { id, slug } });
      if (reopenRequestRef.current !== requestId) return;
      const job = queryRes.data?.productDescriptionJob;
      if (!job) {
        notifications.show({
          title: '후보 다시 열기 실패',
          message: '해당 ID의 후보 작업을 찾지 못했습니다.',
          color: 'red',
        });
        return;
      }
      if (job.productId !== queryRes.data?.tempProductBySlug?.id) {
        throw new Error('다른 제품의 소개 후보입니다. 해당 제품에서 다시 열어 주세요.');
      }
      if (job.status !== 'completed' || !job.candidateHtml) {
        notifications.show({
          title: '후보 다시 열기 실패',
          message: `완료된 후보만 다시 열 수 있습니다. 현재 상태: ${job.status}`,
          color: 'red',
        });
        return;
      }
      // v1 후보 HTML은 저장된 바이트 그대로 렌더링한다.
      setCandidateFromJob(job);
      setIsPreviewOpen(true);
      onJobChange?.(job.id);
      notifications.show({
        title: '후보 다시 열기',
        message: job.appliedAt ? '이미 적용된 후보의 저장된 HTML을 표시합니다.' : '저장된 후보 HTML을 표시합니다.',
        color: 'teal',
      });
    } catch (err) {
      if (reopenRequestRef.current !== requestId) return;
      notifications.show({
        title: '후보 다시 열기 실패',
        message: err instanceof Error ? err.message : '후보 작업을 조회하지 못했습니다.',
        color: 'red',
      });
    } finally {
      if (reopenRequestRef.current === requestId) setReopening(false);
    }
  };

  useEffect(
    () => () => {
      // 생성이 자신의 주소를 반영해 route effect에 cleanup이 없어도 재조회 권한을 종료한다.
      reopenRequestRef.current += 1;
      applyRequestRef.current += 1;
      if (generateBaseAddressRef.current) {
        generateRequestRef.current += 1;
        generateBaseAddressRef.current = null;
      }
    },
    []
  );

  useEffect(() => {
    // 주소가 바뀌면 같은 ID 재진입도 이전 Apply의 후처리 권한을 되살리지 않는다.
    applyRequestRef.current += 1;
    isApplyingRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 주소 변경 시 이전 Apply 권한 리셋에 필요
    setApplying(false);
    const requestId = ++reopenRequestRef.current;
    const cancelReopen = () => {
      reopenRequestRef.current += 1;
      setReopening(false);
    };
    setReopening(false);
    const generation = generateBaseAddressRef.current;
    if (generation && (generation.slug !== slug || generation.jobId !== descriptionJobId)) {
      // 외부에서 후보 주소(ID 변경·제거, 다른 제품)를 선택하면 진행 중 생성의 화면 쓰기 권한을 종료한다.
      generateRequestRef.current += 1;
      generateBaseAddressRef.current = null;
      isSubmittingRef.current = false;
      setLoading(false);
      notifications.hide(`generating-description-${generation.slug}`);
    } else if (generation) {
      // 생성이 onJobChange로 반영한 주소는 외부 전환과 구분해 생성이 계속 화면을 담당한다.
      return;
    }
    if (!descriptionJobId) return cancelReopen;
    const startedAt = Date.now();
    const resume = async () => {
      setJobIdInput(descriptionJobId);
      setReopening(true);
      setStaleApplyNotice(null);
      setCandidateJob(null);
      setIsPreviewOpen(false);
      try {
        while (reopenRequestRef.current === requestId) {
          const response = await getProductDescriptionJob({ variables: { id: descriptionJobId, slug } });
          if (reopenRequestRef.current !== requestId) return;
          const job = response.data?.productDescriptionJob;
          if (!job) throw new Error('해당 ID의 후보 작업을 찾지 못했습니다.');
          if (job.productId !== response.data?.tempProductBySlug?.id)
            throw new Error('다른 제품의 소개 후보입니다. 해당 제품에서 다시 열어 주세요.');
          if (job.status === 'completed' && job.candidateHtml) {
            setCandidateJob(job);
            setIsPreviewOpen(true);
            return;
          }
          if (job.status !== 'pending' && job.status !== 'in_progress')
            throw new Error(job.error || job.message || `후보를 열 수 없습니다: ${job.status}`);
          if (Date.now() - startedAt >= MAX_POLL_TIMEOUT_MS) {
            notifications.show({
              title: '화면 대기 종료',
              message: '작업 실패가 아닙니다. 백그라운드 작업이 끝나면 이 주소에서 후보를 다시 열 수 있습니다.',
              color: 'blue',
            });
            return;
          }
          await delay(POLL_INTERVAL_MS);
        }
      } catch (error) {
        if (reopenRequestRef.current === requestId)
          notifications.show({
            title: '후보 다시 열기 실패',
            message: error instanceof Error ? error.message : '후보 조회 실패',
            color: 'red',
          });
      } finally {
        if (reopenRequestRef.current === requestId) setReopening(false);
      }
    };
    void resume();
    return cancelReopen;
  }, [descriptionJobId, slug, getProductDescriptionJob]);

  const handleApply = async () => {
    if (!candidateJob || isApplyingRef.current || applying) return;
    const applyRequest = ++applyRequestRef.current;

    try {
      isApplyingRef.current = true;
      setApplying(true);

      const result = await applyCandidateMutation({
        variables: { jobId: candidateJob.id },
      });
      if (applyRequestRef.current !== applyRequest) return;

      const updatedJob = result.data?.applyProductDescriptionCandidate?.job;
      if (updatedJob?.status === 'completed') {
        notifications.show({
          title: result.data?.applyProductDescriptionCandidate?.alreadyApplied ? '과거에 적용된 후보' : '적용 완료',
          message: result.data?.applyProductDescriptionCandidate?.alreadyApplied
            ? '이 후보는 과거에 적용되었습니다. 이후 사람 편집은 그대로 유지되며 다시 덮어쓰지 않았습니다.'
            : 'AI 소개가 제품에 반영되었습니다.',
          color: 'teal',
        });
        setIsPreviewOpen(false);
        setCandidateJob(null);
        setStaleApplyNotice(null);
        await refetchProductQueries();
      } else {
        notifications.show({
          title: '적용 실패',
          message: updatedJob?.message || '소개 초안 적용에 실패했습니다.',
          color: 'red',
        });
      }
    } catch (err) {
      if (applyRequestRef.current !== applyRequest) return;
      const message = err instanceof Error ? err.message : 'AI 소개 적용 중 오류가 발생했습니다.';
      if (CombinedGraphQLErrors.is(err) && err.errors.some(item => item.extensions?.code === 'STALE_CANDIDATE')) {
        // stale 적용은 수동 편집을 보존하고 재생성 경로로 안내한다.
        setStaleApplyNotice(message);
      }
      notifications.show({
        title: '적용 실패',
        message,
        color: 'red',
      });
    } finally {
      if (applyRequestRef.current === applyRequest) {
        isApplyingRef.current = false;
        setApplying(false);
      }
    }
  };

  const handleGenerate = async () => {
    if (isSubmittingRef.current || loading) return;

    const notificationId = `generating-description-${slug}`;
    let cancelDeadline = () => {};
    const generateRequest = ++generateRequestRef.current;

    try {
      isSubmittingRef.current = true;
      generateBaseAddressRef.current = { slug };
      reopenRequestRef.current += 1;
      setReopening(false);
      setLoading(true);

      notifications.show({
        id: notificationId,
        loading: true,
        title: 'AI 소개 생성 중',
        message: 'LLM으로 AI 소개를 생성하고 있습니다...',
        autoClose: 30_000,
        withCloseButton: true,
      });

      const deadline = new Promise<never>((_, reject) => {
        const deadlineTimer = setTimeout(() => {
          reject(new Error('소개 생성 요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'));
        }, CLIENT_TIMEOUT_MS);
        cancelDeadline = () => clearTimeout(deadlineTimer);
      });

      const request = generateDescriptionMutation({
        variables: { input: { slug } },
        context: { timeout: CLIENT_TIMEOUT_MS },
      });
      request.catch(() => {});

      const result = await Promise.race([request, deadline]);
      cancelDeadline();

      const initialJob = result?.data?.generateProductDescription?.job;

      if (!initialJob) {
        if (generateRequestRef.current !== generateRequest) return;
        notifications.hide(notificationId);
        notifications.show({
          title: '생성 실패',
          message: '작업 상태를 확인할 수 없습니다.',
          color: 'red',
        });
        return;
      }

      if (initialJob.status === 'completed') {
        if (generateRequestRef.current !== generateRequest) return;
        notifications.hide(notificationId);
        notifications.show({
          title: 'AI 소개 초안 생성 완료',
          message: '소개 초안이 생성되었습니다. 내용을 검토한 후 적용해주세요.',
          color: 'teal',
        });
        setCandidateFromJob(initialJob);
        setStaleApplyNotice(null);
        setIsPreviewOpen(true);
        return;
      }

      if (initialJob.status === 'failed') {
        if (generateRequestRef.current !== generateRequest) return;
        notifications.hide(notificationId);
        notifications.show({
          title: '생성 실패',
          message: initialJob.message || 'AI 소개 생성에 실패했습니다.',
          color: 'red',
        });
        return;
      }

      const jobId = initialJob.id;
      if (generateRequestRef.current !== generateRequest) return;
      generateBaseAddressRef.current = { jobId, slug };
      setJobIdInput(jobId);
      onJobChange?.(jobId);
      const startedAt = Date.now();

      while (generateRequestRef.current === generateRequest) {
        await delay(POLL_INTERVAL_MS);

        if (generateRequestRef.current !== generateRequest) return;
        if (Date.now() - startedAt > MAX_POLL_TIMEOUT_MS) {
          notifications.hide(notificationId);
          notifications.show({
            title: '화면 대기 종료',
            message:
              '작업 실패가 아닙니다. 소개 생성은 백그라운드에서 진행됩니다. 이 주소나 후보 작업 ID로 다시 방문해 주세요.',
            color: 'blue',
          });
          break;
        }

        try {
          const queryRes = await getProductDescriptionJob({ variables: { id: jobId, slug } });
          const job = queryRes.data?.productDescriptionJob;
          if (!job) continue;
          if (generateRequestRef.current !== generateRequest) return;

          if (job.status === 'completed') {
            notifications.hide(notificationId);
            notifications.show({
              title: 'AI 소개 초안 생성 완료',
              message: '소개 초안이 생성되었습니다. 내용을 검토한 후 적용해주세요.',
              color: 'teal',
            });
            setCandidateFromJob(job);
            setStaleApplyNotice(null);
            setIsPreviewOpen(true);
            break;
          }

          if (job.status === 'failed' || job.status === 'superseded') {
            notifications.hide(notificationId);
            notifications.show({
              title: job.status === 'superseded' ? '후보 폐기' : '생성 실패',
              message:
                job.status === 'superseded'
                  ? '제품 정보 변경으로 후보가 폐기되었습니다. 다시 생성해 주세요.'
                  : job.error || job.message || 'AI 소개 생성에 실패했습니다.',
              color: 'red',
            });
            break;
          }
        } catch (pollErr) {
          console.warn('[useGenerateProductDescriptionButton] Polling error:', pollErr);
        }
      }
    } catch (err) {
      if (generateRequestRef.current !== generateRequest) return;
      notifications.hide(notificationId);
      const isTimeout =
        err instanceof Error &&
        (err.name === 'TimeoutError' ||
          err.message.toLowerCase().includes('timeout') ||
          err.message.toLowerCase().includes('timed out'));

      notifications.show({
        title: '생성 실패',
        message: isTimeout
          ? '소개 생성 요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'
          : err instanceof Error
            ? err.message
            : 'AI 소개 생성 중 오류가 발생했습니다.',
        color: 'red',
      });
      console.error('generate description failed:', err);
    } finally {
      cancelDeadline();
      if (generateRequestRef.current === generateRequest) {
        generateBaseAddressRef.current = null;
        isSubmittingRef.current = false;
        setLoading(false);
      }
    }
  };

  return {
    handleGenerate,
    isGenerating: loading,
    candidateJob,
    isPreviewOpen,
    openPreview,
    closePreview,
    isApplying: applying,
    handleApply,
    jobIdInput,
    setJobIdInput,
    isReopening: reopening,
    handleReopenJob,
    staleApplyNotice,
    clearStaleApplyNotice: () => setStaleApplyNotice(null),
  };
}
