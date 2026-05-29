import { ApolloServerPlugin } from '@apollo/server';
import { ApolloServer } from '@apollo/server';
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from '@apollo/server/plugin/landingPage/default';
import type { DomainError } from '@darun/utils-error';
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

function isDomainError(error: unknown): error is DomainError {
  return error instanceof Error && 'code' in error;
}

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
    formatError: (formattedError, error) => {
      if (isDomainError(error)) {
        return {
          ...formattedError,
          extensions: {
            ...formattedError.extensions,
            code: error.code,
          },
        };
      }
      return formattedError;
    },
    plugins: [
      config.playground
        ? ApolloServerPluginLandingPageLocalDefault()
        : ApolloServerPluginLandingPageProductionDefault(),
      ...(config.plugins ?? []),
    ],
  });

  return cachedServer;
}
