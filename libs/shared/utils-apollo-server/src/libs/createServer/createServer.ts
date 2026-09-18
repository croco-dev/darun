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

function findDomainError(error: unknown): DomainError | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 5; depth += 1) {
    if (current instanceof Error && 'code' in current && typeof current.code === 'string') {
      return current as DomainError;
    }
    if (!(current instanceof Error) || !('originalError' in current)) {
      return undefined;
    }
    current = current.originalError;
  }
  return undefined;
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
      console.error('[GraphQL Error]', error);
      const domainError = findDomainError(error);
      if (domainError) {
        return {
          ...formattedError,
          extensions: {
            ...formattedError.extensions,
            code: domainError.code,
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
