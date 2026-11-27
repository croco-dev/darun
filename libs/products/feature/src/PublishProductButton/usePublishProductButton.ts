import { gql } from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
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
      onCompleted: data => {
        if (data?.publishProduct?.product?.id) {
          notifications.show({
            message: '서비스가 노출 설정되었습니다.',
            color: 'teal',
          });
        }
      },
    }
  );

  const publishProduct = async (reviewToken?: string) => {
    if (isPublishing || Boolean(data?.tempProductBySlug?.publishedAt)) {
      return;
    }
    try {
      const result = await publishProductMutation({
        variables: {
          input: {
            slug,
            ...(reviewToken !== undefined && { reviewToken }),
          },
        },
      });
      if (result.data?.publishProduct?.product.publishedAt) return 'published';
    } catch (error) {
      if (
        CombinedGraphQLErrors.is(error) &&
        error.errors.some(({ extensions }) => extensions?.code === 'product/publish-review-changed')
      )
        return 'review-changed';
      notifications.show({
        message: error instanceof Error ? error.message : '서비스를 발행하지 못했습니다.',
        color: 'red',
      });
      console.error('mutation failed:', error);
    }
  };
  return {
    loading: isQueryLoading || isPublishing,
    isPublished: Boolean(data?.tempProductBySlug?.publishedAt),
    publishProduct,
  };
}
