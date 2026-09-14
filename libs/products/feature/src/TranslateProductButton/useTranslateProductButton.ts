import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { RequestProductTranslationOnTranslateButtonDocument } from '@darun/provider-graphql';
import { notifications } from '@mantine/notifications';
import { useRef, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  mutation RequestProductTranslationOnTranslateButton($slug: String!) {
    requestProductTranslation(slug: $slug) {
      entityId
      status
      message
    }
  }
`;

type TranslateProductButtonProps = {
  slug: string;
};

const CLIENT_TIMEOUT_MS = 25_000;

export function useTranslateProductButton({ slug }: TranslateProductButtonProps) {
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);
  const [requestTranslationMutation] = useMutation(RequestProductTranslationOnTranslateButtonDocument);

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

      notifications.hide(notificationId);

      if (result?.data?.requestProductTranslation?.status === 'completed') {
        notifications.show({
          title: '번역 완료',
          message: result.data.requestProductTranslation.message || '상품 및 기능의 영문 번역이 완료되었습니다.',
          color: 'teal',
        });
      }
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
  };
}
