/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApolloServer } from '@apollo/server';
import { LambdaHandlerOptions } from '@as-integrations/aws-lambda';
import { handlers, startServerAndCreateLambdaHandler } from '@as-integrations/aws-lambda';
import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { GraphQLContext } from '../GraphQLContext';

export function createLambdaHandler(
  middlewares: (() => void | Promise<void>)[],
  server: ApolloServer,
  options?: LambdaHandlerOptions<
    handlers.RequestHandler<APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2>,
    GraphQLContext
  >
): APIGatewayProxyHandlerV2 {
  const handler = startServerAndCreateLambdaHandler(
    server,
    handlers.createAPIGatewayProxyEventV2RequestHandler(),
    options ?? {}
  );

  let initPromise: Promise<void> | null = null;
  let initialized = false;

  const wrappedHandler: APIGatewayProxyHandlerV2 = async (event, context, callback) => {
    if (!initialized && initPromise === null) {
      const freshResults = middlewares.map(m => m());
      const freshAsync = freshResults.filter((r): r is Promise<void> => r instanceof Promise);

      if (freshAsync.length === 0) {
        initialized = true;
      } else {
        initPromise = Promise.all(freshAsync)
          .then(() => {
            initialized = true;
            initPromise = null;
          })
          .catch(error => {
            initPromise = null;
            throw error;
          });
      }
    }

    if (initPromise) {
      await initPromise;
    }

    return handler(event, context, callback) as APIGatewayProxyStructuredResultV2;
  };

  return wrappedHandler;
}
