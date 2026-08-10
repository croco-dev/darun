import 'reflect-metadata';
import './config';
import { startStandaloneServer } from '@apollo/server/standalone';
import { GetAccount } from '@darun/accounts-domain';
import { createAuthChecker, createServer } from '@darun/utils-apollo-server';
import { createSentryApolloLogPlugin } from '@darun/utils-sentry';
import { GraphQLISODateTime } from 'type-graphql';
import { Container } from 'typedi';
import { resolvers } from './app/resolvers';
import { createMongodbConnection, createPostgresConnection } from './config/database';
import { IS_LOCAL } from './config/environment';
import { createGraphQLContext } from './functions/context';

async function bootstrap() {
  await Promise.all([createPostgresConnection(), createMongodbConnection()]);

  const server = createServer({
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
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async ({ req }) => {
      const authToken = req.headers.authorization?.replace('Bearer ', '');
      const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ?? req.socket.remoteAddress;
      return createGraphQLContext({
        requestId: crypto.randomUUID(),
        authToken,
        clientIp,
        getAccountUseCase: Container.get(GetAccount),
      });
    },
  });

  console.log(`🚀 Server ready at ${url}`);
}

bootstrap();
