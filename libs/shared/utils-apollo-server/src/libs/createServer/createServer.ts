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

function findErrorCallSite(error: unknown): string | undefined {
  let current = error;
  for (let depth = 0; depth < 5 && current instanceof Error; depth += 1) {
    const header = `${current.name}: ${current.message}`;
    if (current.stack?.startsWith(`${header}\n`)) {
      // V8's entire message may contain newlines and fake `at` lines. Only inspect
      // the suffix after its exact header, never lines inside the message itself.
      return current.stack
        .slice(header.length)
        .split('\n')
        .find(line => /^\s+at\s/.test(line));
    }
    // GraphQL wrappers can inherit the original error's stack and a different message.
    current = 'originalError' in current ? current.originalError : undefined;
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
      // Never pass raw GraphQL errors or request material to shared Console breadcrumbs.
      const domainError = findDomainError(error);
      const callSite = findErrorCallSite(error);
      console.error('[GraphQL Error]', {
        code: domainError?.code ?? formattedError.extensions?.code,
        path: formattedError.path,
        callSite,
        locations: formattedError.locations,
      });
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
