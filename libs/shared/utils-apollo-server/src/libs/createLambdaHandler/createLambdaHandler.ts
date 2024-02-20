/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApolloServer } from '@apollo/server';
import { handlers, startServerAndCreateLambdaHandler } from '@as-integrations/aws-lambda';
import { LambdaHandlerOptions } from '@as-integrations/aws-lambda/src/lambdaHandler';
import { RequestHandler } from '@as-integrations/aws-lambda/src/request-handlers/_create';
import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { GraphQLContext } from '../GraphQLContext';

export function createLambdaHandler(
  middlewares: (() => void)[],
  server: ApolloServer,
  options?: LambdaHandlerOptions<
    RequestHandler<APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2>,
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
