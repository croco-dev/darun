import 'reflect-metadata';
import './config';
import { HeaderMap } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { GetAccount } from '@darun/accounts-domain';
import { createAuthChecker, createServer } from '@darun/utils-apollo-server';
import { createSentryApolloLogPlugin } from '@darun/utils-sentry';
import bodyParser from 'body-parser';
import { GraphQLISODateTime } from 'type-graphql';
import { Container } from 'typedi';
import http from 'http';
import { parse as urlParse } from 'url';
import { resolvers } from './app/resolvers';
import { createMongodbConnection, createPostgresConnection } from './config/database';
import { IS_LOCAL } from './config/environment';
import { createGraphQLContext } from './functions/context';

const LOCAL_ORIGIN_REGEX = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function setCorsHeaders(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  const origin = req.headers.origin;
  if (origin && LOCAL_ORIGIN_REGEX.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      req.headers['access-control-request-headers'] ??
        'authorization, content-type, apollographql-client-name, apollographql-client-version'
    );
    res.setHeader('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '86400');
    res.statusCode = 204;
    res.end();
    return true;
  }

  return false;
}

async function bootstrap() {
  await Promise.all([createPostgresConnection(), createMongodbConnection()]);

  let requestHandler: (req: http.IncomingMessage, res: http.ServerResponse) => void = (_req, res) => {
    res.statusCode = 503;
    res.end('Server initializing');
  };

  const httpServer = http.createServer((req, res) => {
    requestHandler(req, res);
  });

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
      plugins: [createSentryApolloLogPlugin(), ApolloServerPluginDrainHttpServer({ httpServer })],
    },
  });

  const jsonParser = bodyParser.json({ limit: '50mb' });

  requestHandler = (req, res) => {
    if (setCorsHeaders(req, res)) {
      return;
    }

    jsonParser(req, res, parseErr => {
      if (parseErr) {
        res.statusCode = 400;
        res.end(parseErr instanceof Error ? parseErr.message : 'Invalid JSON');
        return;
      }

      const headers = new HeaderMap();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value !== undefined) {
          headers.set(key, Array.isArray(value) ? value.join(', ') : value);
        }
      }

      const httpGraphQLRequest = {
        method: req.method?.toUpperCase() ?? 'POST',
        headers,
        search: urlParse(req.url ?? '').search ?? '',
        body: 'body' in req ? req.body : undefined,
      };

      server
        .executeHTTPGraphQLRequest({
          httpGraphQLRequest,
          context: async () => {
            const authToken = req.headers.authorization?.replace('Bearer ', '');
            const clientIp =
              req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ?? req.socket.remoteAddress;
            return createGraphQLContext({
              requestId: crypto.randomUUID(),
              authToken,
              clientIp,
              getAccountUseCase: Container.get(GetAccount),
            });
          },
        })
        .then(async httpGraphQLResponse => {
          for (const [key, value] of httpGraphQLResponse.headers) {
            res.setHeader(key, value);
          }
          res.statusCode = httpGraphQLResponse.status || 200;
          if (httpGraphQLResponse.body.kind === 'complete') {
            res.end(httpGraphQLResponse.body.string);
            return;
          }
          for await (const chunk of httpGraphQLResponse.body.asyncIterator) {
            res.write(chunk);
          }
          res.end();
        })
        .catch(graphqlErr => {
          res.statusCode = 500;
          res.end(graphqlErr instanceof Error ? graphqlErr.message : 'Server error');
        });
    });
  };

  await server.start();

  await new Promise<void>(resolve => {
    httpServer.listen({ port: 4000 }, resolve);
  });

  console.log('🚀 Server ready at http://localhost:4000/');
}

bootstrap();
