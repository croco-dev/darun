import { ApolloLink, Observable } from '@apollo/client';
import { ServerError } from '@apollo/client/errors';

export class ProductPublishReviewUnavailableError extends Error {
  constructor() {
    super('The API schema does not support product publish review.');
  }
}

function isReviewFieldUnavailable(result: ApolloLink.Result | null) {
  const errors = result?.errors;
  return (
    result?.data == null &&
    Array.isArray(errors) &&
    errors.length === 1 &&
    errors[0]?.extensions?.code === 'GRAPHQL_VALIDATION_FAILED' &&
    errors[0]?.path === undefined &&
    typeof errors[0]?.message === 'string' &&
    /^Cannot query field "adminProductPublishReview" on type "Query"\.(?: Did you mean .+\?)?$/.test(errors[0].message)
  );
}

function isLegacyJsonError(error: unknown) {
  if (!ServerError.is(error) || error.statusCode !== 400) return false;
  try {
    return isReviewFieldUnavailable(JSON.parse(error.bodyText));
  } catch {
    return false;
  }
}

function isUsableReviewResult(result: ApolloLink.Result) {
  const { data, errors } = result;
  const review = data?.adminProductPublishReview;
  if (review != null && (typeof review.reviewToken !== 'string' || !review.reviewToken.trim())) return false;

  return (
    errors == null ||
    (Array.isArray(errors) &&
      errors.every(
        error =>
          typeof error?.message === 'string' &&
          (data == null || (error.path?.[0] === 'adminProductPublishReview' && error.path?.[1] === 'translation'))
      ))
  );
}

// Apollo can deliver GraphQL response bodies even when their HTTP status indicates failure.
export const productPublishReviewSchemaCompatibility = new ApolloLink((operation, forward) => {
  if (operation.operationName !== 'AdminProductPublishReviewOnProductPublishReview') return forward(operation);

  return new Observable(observer => {
    const subscription = forward(operation).subscribe({
      next: result => {
        const response = operation.getContext().response as Response | undefined;
        if ((response?.status === 200 || response?.status === 400) && isReviewFieldUnavailable(result)) {
          observer.error(new ProductPublishReviewUnavailableError());
        } else if (response?.status === 200 && isUsableReviewResult(result)) {
          observer.next(result);
        } else {
          observer.error(new Error('The product publish review HTTP request failed.'));
        }
      },
      error: error => observer.error(isLegacyJsonError(error) ? new ProductPublishReviewUnavailableError() : error),
      complete: () => observer.complete(),
    });
    return () => subscription.unsubscribe();
  });
});
