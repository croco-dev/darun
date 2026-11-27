import { gql } from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  PublishProductOnPublishProductButtonDocument,
  TempProductOnPublishProductButtonDocument,
} from '@darun/provider-graphql';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';

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

type PublishConfirmation = { kind: 'review'; reviewToken: string } | { kind: 'legacy' };

export function usePublishProductButton({ slug }: PublishProductButtonProps) {
  const [reviewChanged, setReviewChanged] = useState(false);
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

  const publishProduct = async (confirmation: PublishConfirmation) => {
    if (isPublishing || Boolean(data?.tempProductBySlug?.publishedAt)) {
      return;
    }
    const reviewToken = confirmation.kind === 'review' ? confirmation.reviewToken : undefined;
    if (confirmation.kind === 'review' && (typeof reviewToken !== 'string' || !reviewToken.trim())) return;

    try {
      await publishProductMutation({
        variables: {
          input: {
            slug,
            ...(reviewToken !== undefined && { reviewToken }),
          },
        },
      });
    } catch (error) {
      if (
        CombinedGraphQLErrors.is(error) &&
        error.errors.some(({ extensions }) => extensions?.code === 'product/publish-review-changed')
      ) {
        setReviewChanged(true);
        return;
      }
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
    reviewChanged,
    clearReviewChanged: () => setReviewChanged(false),
  };
}
