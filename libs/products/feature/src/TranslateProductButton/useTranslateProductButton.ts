import { gql } from '@apollo/client';
import { useLazyQuery, useMutation } from '@apollo/client/react';
import {
  GetTranslationJobOnTranslateButtonDocument,
  RequestProductTranslationOnTranslateButtonDocument,
} from '@darun/provider-graphql';
import { notifications } from '@mantine/notifications';
import { useRef, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  mutation RequestProductTranslationOnTranslateButton($slug: String!) {
    requestProductTranslation(slug: $slug) {
      id
      entityId
      status
      message
    }
  }

  query GetTranslationJobOnTranslateButton($id: String!) {
    translationJob(id: $id) {
      id
      status
      message
      error
    }
  }
`;

type TranslateProductButtonProps = {
  slug: string;
};

const CLIENT_TIMEOUT_MS = 25_000;
const POLL_INTERVAL_MS = 2_000;
const MAX_POLL_TIMEOUT_MS = 180_000; // 3 minutes

export function useTranslateProductButton({ slug }: TranslateProductButtonProps) {
  const [loading, setLoading] = useState(false);
  const [lastStatus, setLastStatus] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);
  const [requestTranslationMutation] = useMutation(RequestProductTranslationOnTranslateButtonDocument);
  const [getTranslationJob] = useLazyQuery(GetTranslationJobOnTranslateButtonDocument, {
    fetchPolicy: 'network-only',
  });

  const markTerminal = (status: string, job?: { id?: string | null; error?: string | null } | null) => {
    setLastStatus(status);
    if (job?.id) {
      setLastJobId(job.id);
    }
    setLastError(status === 'failed' || status === 'superseded' ? (job?.error ?? null) : null);
  };

  const translateProduct = async () => {
    if (isSubmittingRef.current || loading) {
      return;
    }

    const notificationId = `translating-${slug}`;
    let timeoutId: NodeJS.Timeout | undefined;

    try {
      isSubmittingRef.current = true;
      setLoading(true);
      notifications.show({
        id: notificationId,
        loading: true,
        title: '번역 진행 중',
        message: 'LLM으로 영문 번역을 생성하고 있습니다...',
        autoClose: 30_000,
        withCloseButton: true,
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('번역 요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'));
        }, CLIENT_TIMEOUT_MS);
      });

      const mutationPromise = requestTranslationMutation({
        variables: {
          slug,
        },
        context: {
          timeout: CLIENT_TIMEOUT_MS,
        },
      });

      mutationPromise.catch(() => {
        // Prevent unhandled promise rejection if mutation fails after client timeout
      });

      const result = await Promise.race([mutationPromise, timeoutPromise]);

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }

      const initialJob = result?.data?.requestProductTranslation;

      if (!initialJob) {
        notifications.hide(notificationId);
        notifications.show({
          title: '번역 실패',
          message: '번역 요청에 실패했습니다. 다시 시도해 주세요.',
          color: 'red',
        });
        return;
      }

      // 1. If completed synchronously
      if (initialJob.status === 'completed') {
        notifications.hide(notificationId);
        notifications.show({
          title: '번역 완료',
          message: initialJob.message || '상품 및 기능의 영문 번역이 완료되었습니다.',
          color: 'teal',
        });
        markTerminal('completed', initialJob);
        return;
      }

      // 2. If failed or superseded immediately, keep failure visible for a per-product retranslate.
      if (initialJob?.status === 'failed' || initialJob?.status === 'superseded') {
        notifications.hide(notificationId);
        markTerminal(initialJob.status, initialJob);
        notifications.show({
          title: initialJob.status === 'superseded' ? '번역 보류' : '번역 실패',
          message:
            initialJob.status === 'superseded'
              ? '원문이 번역 도중 변경되어 결과가 폐기되었습니다. 이 상품만 다시 번역해 주세요.'
              : initialJob.message || '영문 번역 생성에 실패했습니다. 잠시 후 다시 시도해주세요.',
          color: 'red',
        });
        return;
      }

      // 3. If asynchronous job (pending / in_progress), poll for completion
      if (initialJob?.id) {
        const jobId = initialJob.id;
        const startTime = Date.now();

        await new Promise<void>(resolve => {
          const pollInterval = setInterval(async () => {
            try {
              if (Date.now() - startTime > MAX_POLL_TIMEOUT_MS) {
                clearInterval(pollInterval);
                notifications.hide(notificationId);
                notifications.show({
                  title: '번역 진행 중 (시간 소요)',
                  message: '번역 작업이 백그라운드에서 진행 중입니다. 잠시 후 새로고침해주세요.',
                  color: 'blue',
                });
                resolve();
                return;
              }

              const queryResult = await getTranslationJob({
                variables: { id: jobId },
              });

              const currentJob = queryResult.data?.translationJob;
              if (!currentJob) {
                return;
              }

              if (currentJob.status === 'completed') {
                clearInterval(pollInterval);
                notifications.hide(notificationId);
                notifications.show({
                  title: '번역 완료',
                  message: currentJob.message || '상품 및 기능의 영문 번역이 완료되었습니다.',
                  color: 'teal',
                });
                markTerminal('completed', currentJob);
                resolve();
              } else if (currentJob.status === 'failed' || currentJob.status === 'superseded') {
                clearInterval(pollInterval);
                notifications.hide(notificationId);
                markTerminal(currentJob.status, currentJob);
                notifications.show({
                  title: currentJob.status === 'superseded' ? '번역 보류' : '번역 실패',
                  message:
                    currentJob.status === 'superseded'
                      ? '원문이 번역 도중 변경되어 결과가 폐기되었습니다. 이 상품만 다시 번역해 주세요.'
                      : currentJob.error || currentJob.message || '영문 번역 생성에 실패했습니다.',
                  color: 'red',
                });
                resolve();
              }
            } catch (pollErr) {
              console.warn('[useTranslateProductButton] Polling error:', pollErr);
            }
          }, POLL_INTERVAL_MS);
        });
        return;
      }

      // Fallback
      notifications.hide(notificationId);
      notifications.show({
        title: '번역 완료',
        message: initialJob?.message || '상품 및 기능의 영문 번역이 완료되었습니다.',
        color: 'teal',
      });
    } catch (error) {
      notifications.hide(notificationId);
      let errorMessage = '영문 번역 생성 중 오류가 발생했습니다.';
      if (error instanceof Error) {
        const lower = error.message.toLowerCase();
        if (error.name === 'TimeoutError' || lower.includes('timed out') || lower.includes('timeout')) {
          errorMessage = '번역 요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
        } else {
          errorMessage = error.message;
        }
      }
      notifications.show({
        title: '번역 실패',
        message: errorMessage,
        color: 'red',
      });
      console.error('Translation mutation failed:', error);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  return {
    loading,
    translateProduct,
    lastStatus,
    lastError,
    lastJobId,
  };
}
