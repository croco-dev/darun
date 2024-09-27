import '../config';
import { GetAccount } from '@darun/backend';
import { createAuthChecker, createLambdaHandler, createServer } from '@darun/utils-apollo-server';
import { createSentryApolloLogPlugin } from '@darun/utils-sentry';
import * as Sentry from '@sentry/aws-serverless';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { GraphQLISODateTime } from 'type-graphql';
import { Container } from 'typedi';
import { resolvers } from '../app/resolvers';
import { createMongodbConnection, createMysqlConnection } from '../config/database';
import { IS_LOCAL } from '../config/environment';

export const handler: APIGatewayProxyHandlerV2 = Sentry.wrapHandler(
  createLambdaHandler(
    [createMysqlConnection, createMongodbConnection],
    createServer({
      options: {
        resolvers,
        container: Container,
        emitSchemaFile: IS_LOCAL ? 'schema.graphql' : false,
        authChecker: createAuthChecker(),
        scalarsMap: [{ type: Date, scalar: GraphQLISODateTime }],
      },
      config: {
        playground: IS_LOCAL,
        plugins: [createSentryApolloLogPlugin()],
      },
    }),
    {
      context: async ({ event }) => {
        const authToken = event.headers?.['authorization']?.replace('Bearer ', '');

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
  )
);
