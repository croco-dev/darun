import '../config';
import { GetAccount } from '@darun/backend';
import { createAuthChecker, createLambdaHandler, createServer } from '@darun/utils-apollo-server';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { Container } from 'typedi';
import { resolvers } from '../app/resolvers';
import { createDatabase } from '../config/database';
import { IS_LOCAL } from '../config/environment';

export const handler: APIGatewayProxyHandlerV2 = createLambdaHandler(
  [createDatabase],
  createServer({
    options: {
      resolvers,
      container: Container,
      emitSchemaFile: IS_LOCAL ? 'schema.graphql' : false,
      authChecker: createAuthChecker(),
    },
    config: {
      playground: IS_LOCAL,
    },
  }),
  {
    context: async ({ event }) => {
      const authToken = event.headers?.['Authorization']?.replace('Bearer ', '');
      return {
        requestId: event.requestContext.requestId,
        authToken,
        getUserId: () =>
          Container.get(GetAccount)
            .execute({ token: authToken })
            .then(account => account?.id),
        getRoles: () =>
          Container.get(GetAccount)
            .execute({ token: authToken })
            .then(account => account?.roles ?? []),
      };
    },
  }
);
