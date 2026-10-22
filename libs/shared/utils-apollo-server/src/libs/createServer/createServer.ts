import { ApolloServerPlugin } from '@apollo/server';
import { ApolloServer } from '@apollo/server';
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from '@apollo/server/plugin/landingPage/default';
import { formatServerError } from './formatError';
import { GraphQLSchema } from 'graphql/type';
import { BuildSchemaOptions } from 'type-graphql';
import { buildSchemaSync } from 'type-graphql';

type CreateApolloServerParams = {
  options: Omit<BuildSchemaOptions, 'skipCheck'>;
  config: {
    playground: boolean;
    plugins?: ApolloServerPlugin[];
  };
};

let schema: GraphQLSchema | undefined = undefined;
let cachedServer: ApolloServer | undefined = undefined;
export function createServer({ options, config }: CreateApolloServerParams): ApolloServer {
  schema ??= buildSchemaSync({
    ...options,
    skipCheck: true,
  });

  cachedServer ??= new ApolloServer({
    schema,
    allowBatchedHttpRequests: true,
    introspection: config.playground,
    includeStacktraceInErrorResponses: config.playground,
    formatError: (formattedError, error) => formatServerError(formattedError, error, config.playground),
    plugins: [
      config.playground
        ? ApolloServerPluginLandingPageLocalDefault()
        : ApolloServerPluginLandingPageProductionDefault(),
      ...(config.plugins ?? []),
    ],
  });

  return cachedServer;
}
