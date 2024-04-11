import { gql } from '@apollo/client';
import { useIndexProductOnIndexProductButtonMutation } from './__generated__/useIndexProductButton';

gql`
  mutation IndexProductOnIndexProductButton($input: IndexProductInput!) {
    indexProduct(input: $input) {
      indexed
    }
  }
`;

type IndexProductButtonProps = {
  slug: string;
};

export function useIndexProductButton({ slug }: IndexProductButtonProps) {
  const [indexProductMutation] = useIndexProductOnIndexProductButtonMutation({});

  const indexProduct = async () => {
    await indexProductMutation({
      variables: {
        input: {
          slug,
        },
      },
    });
  };
  return {
    indexProduct,
  };
}
