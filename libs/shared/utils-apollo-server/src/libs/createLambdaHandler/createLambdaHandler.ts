/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApolloServer } from '@apollo/server';
import { LambdaHandlerOptions } from '@as-integrations/aws-lambda';
import { handlers, startServerAndCreateLambdaHandler } from '@as-integrations/aws-lambda';
import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { GraphQLContext } from '../GraphQLContext';

export function createLambdaHandler(
  middlewares: (() => void)[],
  server: ApolloServer,
  options?: LambdaHandlerOptions<
    handlers.RequestHandler<APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2>,
    GraphQLContext
  >
): APIGatewayProxyHandlerV2 {
  for (const middleware of middlewares) {
    middleware();
  }
  return startServerAndCreateLambdaHandler(
    server,
    handlers.createAPIGatewayProxyEventV2RequestHandler(),
    options ?? {}
  );
}
