import { gql } from '@apollo/client';
import { useIndexProductOnIndexProductButtonMutation } from './__generated__/useIndexProductButton';

gql`
  mutation IndexProductOnIndexProductButton($input: IndexProductInput!) {
    indexProduct(input: $input) {
      indexed
    }
  }
`;

export function useIndexProductButton() {
  const [indexProductMutation] = useIndexProductOnIndexProductButtonMutation({});

  const indexProduct = async () => {
    await indexProductMutation({
      variables: {
        input: {
          slug: 'toss',
        },
      },
    });
  };
  return {
    indexProduct,
  };
}
