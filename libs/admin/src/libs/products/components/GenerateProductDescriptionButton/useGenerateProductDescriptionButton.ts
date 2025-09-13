import { gql } from '@apollo/client';
import { useGenerateProductDescriptionMutation } from './__generated__/useGenerateProductDescriptionButton';

gql`
  mutation GenerateProductDescription($input: GenerateProductDescriptionInput!) {
    generateProductDescription(input: $input) {
      product {
        id
        name
        description
      }
    }
  }
`;

export function useGenerateProductDescriptionButton(slug: string) {
  const [generateDescription, { loading, error }] = useGenerateProductDescriptionMutation();

  const handleGenerate = async () => {
    await generateDescription({
      variables: {
        input: {
          slug,
        },
      },
    });
  };

  return {
    handleGenerate,
    isGenerating: loading,
    error,
  };
}
