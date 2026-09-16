import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  PublishProductOnPublishProductButtonDocument,
  TempProductOnPublishProductButtonDocument,
} from '@darun/provider-graphql';
import { notifications } from '@mantine/notifications';

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
  const { data, loading: isQueryLoading } = useQuery(TempProductOnPublishProductButtonDocument, {
    variables: {
      slug,
    },
  });
  const [publishProductMutation, { loading: isPublishing }] = useMutation(
    PublishProductOnPublishProductButtonDocument,
    {
      refetchQueries: [TempProductOnPublishProductButtonDocument],
      awaitRefetchQueries: true,
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

  const publishProduct = async () => {
    if (isPublishing || Boolean(data?.tempProductBySlug?.publishedAt)) {
      return;
    }
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
    }
  };
  return {
    loading: isQueryLoading || isPublishing,
    isPublished: Boolean(data?.tempProductBySlug?.publishedAt),
    publishProduct,
  };
}
