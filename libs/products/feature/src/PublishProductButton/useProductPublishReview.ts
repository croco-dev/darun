import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { AdminProductPublishReviewOnProductPublishReviewDocument } from '@darun/provider-graphql';
import { ProductPublishReviewUnavailableError } from './productPublishReviewSchemaCompatibility';
import type { usePublishProductButton } from './usePublishProductButton';

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
  publication: ReturnType<typeof usePublishProductButton>;
};

export function useProductPublishReview({ id, slug, publication }: ProductPublishReviewProps) {
  const { loading: publishing, publishProduct, reviewChanged, clearReviewChanged } = publication;
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
    if (result?.data?.adminProductPublishReview) clearReviewChanged();
  }

  async function publish() {
    if (!canPublish) return;
    if (review) {
      await publishProduct({ kind: 'review', reviewToken: review.reviewToken });
    } else if (legacyApi) {
      await publishProduct({ kind: 'legacy' });
    }
  }

  return { id, publishing, loading, error, review, reviewChanged, legacyApi, canPublish, refresh, publish };
}
