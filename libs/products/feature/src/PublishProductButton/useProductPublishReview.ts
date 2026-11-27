import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { AdminProductPublishReviewOnProductPublishReviewDocument } from '@darun/provider-graphql';
import { useState } from 'react';
import { ProductPublishReviewUnavailableError } from './productPublishReviewSchemaCompatibility';
import type { usePublishProductButton } from './usePublishProductButton';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query AdminProductPublishReviewOnProductPublishReview($slug: String!) {
    adminProductPublishReview(slug: $slug) {
      id
      publishedAt
      reviewToken
      hasName
      hasSummary
      hasDescription
      hasCategory
      hasLogo
      hasScreenshot
      officialLinkStatus
      translation {
        name {
          status
          sourceHash
        }
        summary {
          status
          sourceHash
        }
        description {
          status
          sourceHash
        }
        observedAt
        latestJobFailed
      }
    }
  }
`;

type ProductPublishReviewProps = {
  id: string;
  slug: string;
  publishing: boolean;
  publishProduct: ReturnType<typeof usePublishProductButton>['publishProduct'];
};

export function useProductPublishReview({ id, slug, publishing, publishProduct }: ProductPublishReviewProps) {
  const [reviewChanged, setReviewChanged] = useState(false);
  const { data, loading, error, refetch } = useQuery(AdminProductPublishReviewOnProductPublishReviewDocument, {
    variables: { slug },
    fetchPolicy: 'no-cache',
    errorPolicy: 'all',
    context: { queryDeduplication: false },
  });
  const review = data?.adminProductPublishReview;
  const legacyApi = !review && !reviewChanged && error instanceof ProductPublishReviewUnavailableError;
  const canPublish = !loading && !publishing && !reviewChanged && (review ? !review.publishedAt : legacyApi);

  async function refresh() {
    const result = await refetch().catch(() => undefined);
    if (result?.data?.adminProductPublishReview) setReviewChanged(false);
  }

  async function publish() {
    if (!canPublish) return;
    if ((await publishProduct(review?.reviewToken)) === 'review-changed') setReviewChanged(true);
  }

  return { id, publishing, loading, error, review, reviewChanged, legacyApi, canPublish, refresh, publish };
}
