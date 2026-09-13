import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';

const REQUEST_PRODUCT_TRANSLATION = gql`
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

type RequestProductTranslationData = {
  requestProductTranslation?: {
    entityId: string;
    status: string;
    message: string;
  };
};

type RequestProductTranslationVariables = {
  slug: string;
};

export function useTranslateProductButton({ slug }: TranslateProductButtonProps) {
  const [loading, setLoading] = useState(false);
  const [requestTranslationMutation] = useMutation<RequestProductTranslationData, RequestProductTranslationVariables>(
    REQUEST_PRODUCT_TRANSLATION,
    {
      onError: error => {
        setLoading(false);
        notifications.show({
          title: '번역 실패',
          message: error.message || '영문 번역 생성 중 오류가 발생했습니다.',
          color: 'red',
        });
      },
      onCompleted: data => {
        setLoading(false);
        if (data?.requestProductTranslation?.status === 'completed') {
          notifications.show({
            title: '번역 완료',
            message: data.requestProductTranslation.message || '상품 및 기능의 영문 번역이 완료되었습니다.',
            color: 'teal',
          });
        }
      },
    }
  );

  const translateProduct = async () => {
    try {
      setLoading(true);
      notifications.show({
        id: `translating-${slug}`,
        loading: true,
        title: '번역 진행 중',
        message: 'LLM으로 영문 번역을 생성하고 있습니다...',
        autoClose: false,
        withCloseButton: false,
      });

      await requestTranslationMutation({
        variables: {
          slug,
        },
      });

      notifications.hide(`translating-${slug}`);
    } catch (error) {
      notifications.hide(`translating-${slug}`);
      setLoading(false);
      console.error('Translation mutation failed:', error);
    }
  };

  return {
    loading,
    translateProduct,
  };
}
