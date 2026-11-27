import { ApolloLink, Observable } from '@apollo/client';
import { ServerError } from '@apollo/client/errors';

export class ProductPublishReviewUnavailableError extends Error {
  constructor() {
    super('The API schema does not support product publish review.');
  }
}

function isReviewFieldUnavailable(errors: unknown) {
  return (
    Array.isArray(errors) &&
    errors.length === 1 &&
    errors[0]?.extensions?.code === 'GRAPHQL_VALIDATION_FAILED' &&
    typeof errors[0]?.message === 'string' &&
    /^Cannot query field "adminProductPublishReview" on type "Query"\.(?: Did you mean .+\?)?$/.test(errors[0].message)
  );
}

function isLegacyJsonError(error: unknown) {
  if (!ServerError.is(error) || error.statusCode !== 400) return false;
  try {
    return isReviewFieldUnavailable(JSON.parse(error.bodyText)?.errors);
  } catch {
    return false;
  }
}

// Apollo can deliver GraphQL response bodies even when their HTTP status indicates failure.
export const productPublishReviewSchemaCompatibility = new ApolloLink((operation, forward) => {
  if (operation.operationName !== 'AdminProductPublishReviewOnProductPublishReview') return forward(operation);

  return new Observable(observer => {
    const subscription = forward(operation).subscribe({
      next: result => {
        const response = operation.getContext().response as Response | undefined;
        if (
          (response?.status === 200 || response?.status === 400) &&
          result.data == null &&
          isReviewFieldUnavailable(result.errors)
        ) {
          observer.error(new ProductPublishReviewUnavailableError());
        } else if (response?.status === 200) {
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
