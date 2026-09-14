'use client';

import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  PublishProductOnPublishProductButtonDocument,
  TempProductOnPublishProductButtonDocument,
} from '@darun/provider-graphql';
import { notifications } from '@mantine/notifications';
import { useRef } from 'react';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query TempProductOnPublishProductButton($slug: String!) {
    tempProductBySlug(slug: $slug) {
      id
      publishedAt
    }
  }
  mutation PublishProductOnPublishProductButton($input: PublishProductInput!) {
    publishProduct(input: $input) {
      product {
        id
        publishedAt
      }
    }
  }
`;

type PublishProductButtonProps = {
  slug: string;
};

export function usePublishProductButton({ slug }: PublishProductButtonProps) {
  const { data, loading: queryLoading } = useQuery(TempProductOnPublishProductButtonDocument, {
    variables: {
      slug,
    },
  });
  const [publishProductMutation, { loading: mutationLoading }] = useMutation(
    PublishProductOnPublishProductButtonDocument,
    {
      onError: error => {
        notifications.show({ message: error.message, color: 'red' });
      },
      onCompleted: data => {
        if (data.publishProduct.product.publishedAt) {
          notifications.show({
            message: '서비스가 노출 설정되었습니다.',
            color: 'teal',
          });
        }
      },
    }
  );

  const isPublished = Boolean(data?.tempProductBySlug?.publishedAt);
  const loading = queryLoading || mutationLoading;
  const isPublishingRef = useRef(false);

  const publishProduct = async () => {
    if (isPublishingRef.current || loading || isPublished) return;
    isPublishingRef.current = true;
    try {
      await publishProductMutation({
        variables: {
          input: {
            slug,
          },
        },
      });
    } catch (error) {
      console.error('mutation failed:', error);
      throw error;
    } finally {
      isPublishingRef.current = false;
    }
  };
  return {
    loading,
    isPublished,
    publishProduct,
  };
}
