import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { GenerateProductDescriptionDocument } from '@darun/provider-graphql';
import { notifications } from '@mantine/notifications';

gql(`
  mutation GenerateProductDescription($input: GenerateProductDescriptionInput!) {
    generateProductDescription(input: $input) {
      product {
        id
        name
        description
      }
    }
  }
`);

export function useGenerateProductDescriptionButton(slug: string) {
  const [generateDescription, { loading }] = useMutation(GenerateProductDescriptionDocument, {
    onCompleted: () => {
      notifications.show({
        message: 'AI 소개를 생성했어요.',
        color: 'teal',
      });
    },
    onError: error => {
      notifications.show({
        title: '생성 실패',
        message: error.message,
        color: 'red',
      });
    },
  });

  const handleGenerate = async () => {
    try {
      await generateDescription({
        variables: {
          input: {
            slug,
          },
        },
      });
    } catch (error) {
      console.error('generate description failed:', error);
      throw error;
    }
  };

  return {
    handleGenerate,
    isGenerating: loading,
  };
}
