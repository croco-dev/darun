'use client';

import { gql } from '@apollo/client';
import { useApolloClient, useLazyQuery, useMutation } from '@apollo/client/react';
import {
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
    }
  }
`);

const CLIENT_TIMEOUT_MS = 25_000;
const POLL_INTERVAL_MS = 2_000;
const MAX_POLL_TIMEOUT_MS = 180_000;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function useGenerateProductDescriptionButton(slug: string) {
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);
  const apolloClient = useApolloClient();
  const [generateDescriptionMutation] = useMutation(GenerateProductDescriptionDocument);
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

      if (!initialJob || initialJob.status === 'completed') {
        notifications.hide(notificationId);
        notifications.show({
          title: '생성 완료',
          message: initialJob?.message || 'AI 소개를 생성했어요.',
          color: 'teal',
        });
        await refetchProductQueries();
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
              title: '생성 완료',
              message: job.message || 'AI 소개를 생성했어요.',
              color: 'teal',
            });
            await refetchProductQueries();
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
  };
}
