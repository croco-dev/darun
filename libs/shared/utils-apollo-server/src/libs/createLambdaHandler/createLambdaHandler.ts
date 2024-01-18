import { ApolloServer } from '@apollo/server';
import { handlers, startServerAndCreateLambdaHandler } from '@as-integrations/aws-lambda';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';

export function createLambdaHandler(middlewares: (() => void)[], server: ApolloServer): APIGatewayProxyHandlerV2 {
  for (const middleware of middlewares) {
    middleware();
  }
  return startServerAndCreateLambdaHandler(server, handlers.createAPIGatewayProxyEventV2RequestHandler(), {
    context: async ({ event, context }) => {
      return {
        lambdaEvent: event,
        lambdaContext: context,
      };
    },
  });
}
