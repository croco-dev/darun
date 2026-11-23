import { ProductDescriptionError, ProductFeatureErrorCode } from '@darun/products-domain';
import { createSentryApolloLogPlugin } from '@darun/utils-sentry';

export const createGraphQLDiagnostics = () =>
  createSentryApolloLogPlugin({
    ignoredDomainErrorCodes: [
      ProductDescriptionError.EditConflict,
      ProductDescriptionError.InvalidEditPrecondition,
      ProductFeatureErrorCode.NameTooLong,
      ProductFeatureErrorCode.SummaryTooLong,
    ],
  });
