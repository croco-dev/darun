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

  let initialized = false;
  let initPromise: Promise<void> | null = null;

  const wrappedHandler: APIGatewayProxyHandlerV2 = async (event, context, callback) => {
    if (!initialized) {
      if (initPromise === null) {
        initPromise = (async () => {
          const results = middlewares.map(m => m());
          const asyncResults = results.filter((r): r is Promise<void> => r instanceof Promise);
          if (asyncResults.length > 0) {
            await Promise.all(asyncResults);
          }
        })();
      }

      try {
        await initPromise;
        initialized = true;
      } catch (error) {
        initPromise = null;
        throw error;
      }
    }

    return handler(event, context, callback) as APIGatewayProxyStructuredResultV2;
  };

  return wrappedHandler;
}
