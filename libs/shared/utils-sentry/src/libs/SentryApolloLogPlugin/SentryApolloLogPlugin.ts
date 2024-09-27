import { ApolloServerPlugin } from '@apollo/server';
import * as Sentry from '@sentry/node';

export const createSentryApolloLogPlugin = (): ApolloServerPlugin => ({
  requestDidStart: async () => ({
    didEncounterErrors: async ctx => {
      if (!ctx.operation) {
        return;
      }

      for (const err of ctx.errors) {
        // Add scoped report details and send to Sentry
        Sentry.withScope(scope => {
          // Annotate whether failing operation was query/mutation/subscription
          scope.setTag('kind', ctx.operation?.operation);

          // Log query and variables as extras (make sure to strip out sensitive data!)
          scope.setExtra('query', ctx.request.query);
          scope.setExtra('variables', ctx.request.variables);

          if ('path' in err) {
            // We can also add the path as breadcrumb
            scope.addBreadcrumb({
              category: 'query-path',
              message: err.path.join(' > '),
              level: 'debug',
            });
          }

          const transactionId = ctx.request.http?.headers.get('x-transaction-id');
          if (transactionId) {
            scope.setTransactionName(transactionId);
          }

          Sentry.captureException(err);
        });
      }
    },
  }),
});
