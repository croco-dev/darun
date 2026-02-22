import { gql } from '@apollo/client';
import { notifications } from '@mantine/notifications';
import { useGenerateProductDescriptionMutation } from './__generated__/useGenerateProductDescriptionButton';

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
  const [generateDescription, { loading }] = useGenerateProductDescriptionMutation({
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
    } catch {
      return;
    }
  };

  return {
    handleGenerate,
    isGenerating: loading,
  };
}
