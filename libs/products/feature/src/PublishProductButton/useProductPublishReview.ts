import { gql } from '@apollo/client';
import { CombinedGraphQLErrors, ServerError } from '@apollo/client/errors';
import { useQuery } from '@apollo/client/react';
import { AdminProductPublishReviewOnProductPublishReviewDocument } from '@darun/provider-graphql';
import { useState } from 'react';
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

function isReviewFieldUnavailable(error: unknown) {
  let errors: unknown;
  if (CombinedGraphQLErrors.is(error)) {
    errors = error.errors;
  } else if (ServerError.is(error) && error.statusCode === 400) {
    try {
      errors = JSON.parse(error.bodyText)?.errors;
    } catch {
      return false;
    }
  }

  return (
    Array.isArray(errors) &&
    errors.length === 1 &&
    errors[0]?.extensions?.code === 'GRAPHQL_VALIDATION_FAILED' &&
    typeof errors[0]?.message === 'string' &&
    /^Cannot query field "adminProductPublishReview" on type "Query"\.(?: Did you mean .+\?)?$/.test(errors[0].message)
  );
}

export function useProductPublishReview({ id, slug, publishing, publishProduct }: ProductPublishReviewProps) {
  const [reviewChanged, setReviewChanged] = useState(false);
  const { data, loading, error, refetch } = useQuery(AdminProductPublishReviewOnProductPublishReviewDocument, {
    variables: { slug },
    fetchPolicy: 'no-cache',
    errorPolicy: 'all',
    context: { queryDeduplication: false },
  });
  const review = data?.adminProductPublishReview;
  // The admin can deploy before the API. The old schema rejects this document before execution.
  const legacyApi = !review && !reviewChanged && isReviewFieldUnavailable(error);
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
