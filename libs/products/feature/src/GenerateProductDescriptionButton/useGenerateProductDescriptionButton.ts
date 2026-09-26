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
import { useRef, useState } from 'react';

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
  candidateHtml?: string | null;
  message?: string | null;
}

export function useGenerateProductDescriptionButton(slug: string) {
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [candidateJob, setCandidateJob] = useState<CandidateJobInfo | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const isSubmittingRef = useRef(false);
  const isApplyingRef = useRef(false);
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

  const handleApply = async () => {
    if (!candidateJob || isApplyingRef.current || applying) return;

    try {
      isApplyingRef.current = true;
      setApplying(true);

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
        await refetchProductQueries();
      } else {
        notifications.show({
          title: '적용 실패',
          message: updatedJob?.message || '소개 초안 적용에 실패했습니다.',
          color: 'red',
        });
      }
    } catch (err) {
      notifications.show({
        title: '적용 실패',
        message: err instanceof Error ? err.message : 'AI 소개 적용 중 오류가 발생했습니다.',
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
        setCandidateJob({
          id: initialJob.id,
          candidateHtml: initialJob.candidateHtml,
          message: initialJob.message,
        });
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
            setCandidateJob({
              id: job.id,
              candidateHtml: job.candidateHtml,
              message: job.message,
            });
            setIsPreviewOpen(true);
            break;
          }

          if (job.status === 'failed') {
            notifications.hide(notificationId);
            notifications.show({
              title: '생성 실패',
              message: job.error || job.message || 'AI 소개 생성에 실패했습니다.',
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
  };
}
