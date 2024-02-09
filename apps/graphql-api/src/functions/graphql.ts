import '../config';
import { createLambdaHandler, createServer } from '@darun/utils-apollo-server';
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
    },
    config: {
      playground: IS_LOCAL,
    },
  })
);
