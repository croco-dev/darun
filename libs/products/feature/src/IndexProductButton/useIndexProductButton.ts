import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { IndexProductOnIndexProductButtonDocument } from '@darun/provider-graphql';
import { notifications } from '@mantine/notifications';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
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
  const [indexProductMutation] = useMutation(IndexProductOnIndexProductButtonDocument, {
    onError: error => {
      notifications.show({ message: error.message, color: 'red' });
    },
    onCompleted: data => {
      if (data.indexProduct.indexed) {
        notifications.show({
          message: '상품이 색인되었습니다.',
          color: 'teal',
        });
      }
    },
  });

  const indexProduct = async () => {
    try {
      await indexProductMutation({
        variables: {
          input: {
            slug,
          },
        },
      });
    } catch (error) {
      console.error('mutation failed:', error);
      throw error;
    }
  };
  return {
    indexProduct,
  };
}
