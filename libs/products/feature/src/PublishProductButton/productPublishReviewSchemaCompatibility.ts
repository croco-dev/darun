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

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isTimestamp(value: unknown) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isPublishReview(value: unknown): value is Record<string, unknown> {
  if (!isObject(value)) return false;
  const { id, reviewToken, publishedAt, officialLinkStatus, translation } = value;
  const presence = [
    value.hasName,
    value.hasSummary,
    value.hasDescription,
    value.hasCategory,
    value.hasLogo,
    value.hasScreenshot,
  ];
  if (
    typeof id !== 'string' ||
    !id.trim() ||
    typeof reviewToken !== 'string' ||
    !reviewToken.trim() ||
    (publishedAt !== null && !isTimestamp(publishedAt)) ||
    typeof officialLinkStatus !== 'string' ||
    !presence.every(flag => typeof flag === 'boolean')
  ) {
    return false;
  }

  if (translation === null) return true;
  if (
    !isObject(translation) ||
    !isTimestamp(translation.observedAt) ||
    typeof translation.latestJobFailed !== 'boolean'
  ) {
    return false;
  }

  return [translation.name, translation.summary, translation.description].every(
    field =>
      isObject(field) &&
      typeof field.status === 'string' &&
      (field.sourceHash === null || typeof field.sourceHash === 'string')
  );
}

function isUsableReviewResult(result: ApolloLink.Result) {
  const { data, errors } = result;
  if (errors != null && (!Array.isArray(errors) || errors.some(error => typeof error?.message !== 'string'))) {
    return false;
  }

  if (data == null) return Boolean(errors?.length);
  if (!isObject(data)) return false;

  const review = data.adminProductPublishReview;
  if (review === null) return true;
  if (!isPublishReview(review)) return false;

  return (
    !errors?.length ||
    (review.translation === null &&
      errors.every(error => error.path?.[0] === 'adminProductPublishReview' && error.path?.[1] === 'translation'))
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
