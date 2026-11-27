import { Observable } from '@apollo/client';
import { CombinedGraphQLErrors, ServerError } from '@apollo/client/errors';
import { ErrorLink } from '@apollo/client/link/error';

export class ProductPublishReviewUnavailableError extends Error {
  constructor() {
    super('The API schema does not support product publish review.');
  }
}

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

// The admin can deploy before the API. Only accept a validation response from the old schema.
export const productPublishReviewSchemaCompatibility = new ErrorLink(({ error, operation }) => {
  if (operation.operationName !== 'AdminProductPublishReviewOnProductPublishReview') return;
  const response = operation.getContext().response as Response | undefined;
  if ((response?.status !== 200 && response?.status !== 400) || !isReviewFieldUnavailable(error)) return;

  return new Observable(observer => {
    observer.error(new ProductPublishReviewUnavailableError());
  });
});
