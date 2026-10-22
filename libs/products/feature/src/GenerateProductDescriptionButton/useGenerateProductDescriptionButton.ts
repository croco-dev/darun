'use client';

import { gql } from '@apollo/client';
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

  query GetProductDescriptionJob($id: String!) {
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

export function useGenerateProductDescriptionButton(slug: string) {
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [candidateJob, setCandidateJob] = useState<CandidateJobInfo | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [jobIdInput, setJobIdInput] = useState('');
  const [reopening, setReopening] = useState(false);
  const activeSlug = useRef(slug);
  useEffect(() => {
    activeSlug.current = slug;
  }, [slug]);
  const [staleApplyNotice, setStaleApplyNotice] = useState<string | null>(null);
  const [previousSlug, setPreviousSlug] = useState(slug);
  if (previousSlug !== slug) {
    setPreviousSlug(slug);
    setCandidateJob(null);
    setIsPreviewOpen(false);
    setJobIdInput('');
    setStaleApplyNotice(null);
  }
  const isSubmittingRef = useRef(false);
  const isApplyingRef = useRef(false);
  const apolloClient = useApolloClient();
  const [generateDescriptionMutation] = useMutation(GenerateProductDescriptionDocument);
  const [applyCandidateMutation] = useMutation(ApplyProductDescriptionCandidateDocument);
  const [getProductDescriptionJob] = useLazyQuery(GetProductDescriptionJobDocument, {
    fetchPolicy: 'network-only',
  });
  const [getCurrentProduct] = useLazyQuery(TempProductBySlugOnProductDescriptionDocument, {
    fetchPolicy: 'network-only',
  });
  const assertCurrentTarget = async (job: CandidateJobInfo) => {
    const response = await getCurrentProduct({ variables: { slug } });
    const productId = response.data?.tempProductBySlug?.id;
    if (activeSlug.current !== slug || !productId || job.productId !== productId) {
      throw new Error(
        `현재 제품(${slug})과 후보 대상(${job.productId ?? '알 수 없음'})이 다릅니다. 대상 제품에서 다시 열어주세요.`
      );
    }
  };

  const refetchProductQueries = async () => {
    try {
      await apolloClient.refetchQueries({
        include: [TempProductBySlugOnEditProductDescriptionDocument, TempProductBySlugOnProductDescriptionDocument],
      });
    } catch (refetchErr) {
      console.warn('[useGenerateProductDescriptionButton] Refetch queries failed:', refetchErr);
    }
  };

  const openPreview = async () => {
    if (!candidateJob) return;
    await assertCurrentTarget(candidateJob);
    setIsPreviewOpen(true);
  };
  const closePreview = () => setIsPreviewOpen(false);

  const setCandidateFromJob = async (job: {
    id: string;
    productId?: string | null;
    status?: string | null;
    appliedAt?: string | null;
    candidateHtml?: string | null;
    message?: string | null;
  }) => {
    await assertCurrentTarget(job);
    setCandidateJob({
      id: job.id,
      productId: job.productId ?? null,
      status: job.status ?? null,
      appliedAt: job.appliedAt ?? null,
      candidateHtml: job.candidateHtml,
      message: job.message,
    });
  };

  const isStaleApplyError = (message: string) =>
    message.includes('제품 정보가 생성 이후 변경') || message.includes('Base description has changed');

  const handleReopenJob = async () => {
    const id = jobIdInput.trim();
    if (!id || reopening) return;
    try {
      setReopening(true);
      setStaleApplyNotice(null);
      const queryRes = await getProductDescriptionJob({ variables: { id } });
      const job = queryRes.data?.productDescriptionJob;
      if (!job) {
        notifications.show({
          title: '후보 다시 열기 실패',
          message: '해당 ID의 후보 작업을 찾지 못했습니다.',
          color: 'red',
        });
        return;
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
      await setCandidateFromJob(job);
      setIsPreviewOpen(true);
      notifications.show({
        title: '후보 다시 열기',
        message: job.appliedAt ? '이미 적용된 후보의 저장된 HTML을 표시합니다.' : '저장된 후보 HTML을 표시합니다.',
        color: 'teal',
      });
    } catch (err) {
      notifications.show({
        title: '후보 다시 열기 실패',
        message: err instanceof Error ? err.message : '후보 작업을 조회하지 못했습니다.',
        color: 'red',
      });
    } finally {
      setReopening(false);
    }
  };

  const handleApply = async () => {
    if (!candidateJob || isApplyingRef.current || applying) return;

    try {
      isApplyingRef.current = true;
      setApplying(true);
      await assertCurrentTarget(candidateJob);

      const result = await applyCandidateMutation({
        variables: { jobId: candidateJob.id },
      });

      const updatedJob = result.data?.applyProductDescriptionCandidate?.job;
      if (updatedJob?.status === 'completed') {
        notifications.show({
          title: '적용 완료',
          message: 'AI 소개가 제품에 반영되었습니다.',
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
      const message = err instanceof Error ? err.message : 'AI 소개 적용 중 오류가 발생했습니다.';
      if (isStaleApplyError(message)) {
        // stale 적용은 수동 편집을 보존하고 재생성 경로로 안내한다.
        setStaleApplyNotice(message);
      }
      notifications.show({
        title: '적용 실패',
        message,
        color: 'red',
      });
    } finally {
      isApplyingRef.current = false;
      setApplying(false);
    }
  };

  const handleGenerate = async () => {
    if (isSubmittingRef.current || loading) return;

    const notificationId = `generating-description-${slug}`;
    let deadlineTimer: ReturnType<typeof setTimeout> | undefined;

    try {
      isSubmittingRef.current = true;
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
        deadlineTimer = setTimeout(() => {
          reject(new Error('소개 생성 요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'));
        }, CLIENT_TIMEOUT_MS);
      });

      const request = generateDescriptionMutation({
        variables: { input: { slug } },
        context: { timeout: CLIENT_TIMEOUT_MS },
      });
      request.catch(() => {});

      const result = await Promise.race([request, deadline]);
      if (deadlineTimer) {
        clearTimeout(deadlineTimer);
        deadlineTimer = undefined;
      }

      const initialJob = result?.data?.generateProductDescription?.job;

      if (!initialJob) {
        notifications.hide(notificationId);
        notifications.show({
          title: '생성 실패',
          message: '작업 상태를 확인할 수 없습니다.',
          color: 'red',
        });
        return;
      }

      if (initialJob.status === 'completed') {
        notifications.hide(notificationId);
        notifications.show({
          title: 'AI 소개 초안 생성 완료',
          message: '소개 초안이 생성되었습니다. 내용을 검토한 후 적용해주세요.',
          color: 'teal',
        });
        await setCandidateFromJob(initialJob);
        setStaleApplyNotice(null);
        setIsPreviewOpen(true);
        return;
      }

      if (initialJob.status === 'failed') {
        notifications.hide(notificationId);
        notifications.show({
          title: '생성 실패',
          message: initialJob.message || 'AI 소개 생성에 실패했습니다.',
          color: 'red',
        });
        return;
      }

      const jobId = initialJob.id;
      const startedAt = Date.now();

      while (true) {
        await delay(POLL_INTERVAL_MS);
        if (activeSlug.current !== slug) {
          notifications.hide(notificationId);
          break;
        }

        if (Date.now() - startedAt > MAX_POLL_TIMEOUT_MS) {
          notifications.hide(notificationId);
          notifications.show({
            title: '생성 진행 중 (시간 소요)',
            message: '소개 생성 작업이 백그라운드에서 진행 중입니다. 잠시 후 새로고침해주세요.',
            color: 'blue',
          });
          break;
        }

        try {
          const queryRes = await getProductDescriptionJob({ variables: { id: jobId } });
          const job = queryRes.data?.productDescriptionJob;
          if (!job) continue;

          if (job.status === 'completed') {
            notifications.hide(notificationId);
            notifications.show({
              title: 'AI 소개 초안 생성 완료',
              message: '소개 초안이 생성되었습니다. 내용을 검토한 후 적용해주세요.',
              color: 'teal',
            });
            await setCandidateFromJob(job);
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
      if (deadlineTimer) clearTimeout(deadlineTimer);
      isSubmittingRef.current = false;
      setLoading(false);
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
