import { ProductDescriptionError } from '@darun/products-domain';
import { createSentryApolloLogPlugin } from '@darun/utils-sentry';

export const createGraphQLDiagnostics = () =>
  createSentryApolloLogPlugin({
    ignoredDomainErrorCodes: [ProductDescriptionError.EditConflict, ProductDescriptionError.InvalidEditPrecondition],
  });
