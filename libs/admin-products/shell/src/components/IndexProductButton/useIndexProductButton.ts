import { gql } from '@apollo/client';
import { notifications } from '@mantine/notifications';
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
  const [indexProductMutation] = useIndexProductOnIndexProductButtonMutation({
    onError: error => {
      notifications.show({ message: error.message, color: 'red' });
    },
    onCompleted: data => {
      if (data.indexProduct.indexed) {
        notifications.show({ message: '상품이 색인되었습니다.', color: 'teal' });
      }
    },
  });

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
