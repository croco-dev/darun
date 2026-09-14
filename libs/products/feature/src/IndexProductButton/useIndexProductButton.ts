'use client';

import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { IndexProductOnIndexProductButtonDocument } from '@darun/provider-graphql';
import { notifications } from '@mantine/notifications';
import { useRef } from 'react';

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
  const [indexProductMutation, { loading }] = useMutation(IndexProductOnIndexProductButtonDocument, {
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
  const isIndexingRef = useRef(false);

  const indexProduct = async () => {
    if (isIndexingRef.current || loading) return;
    isIndexingRef.current = true;
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
    } finally {
      isIndexingRef.current = false;
    }
  };
  return {
    indexProduct,
    loading,
  };
}
