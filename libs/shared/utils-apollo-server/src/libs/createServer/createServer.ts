import { ApolloServer, ApolloServerPlugin } from '@apollo/server';
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from '@apollo/server/plugin/landingPage/default';
import { GraphQLSchema } from 'graphql/type';
import { BuildSchemaOptions, buildSchemaSync } from 'type-graphql';

type CreateApolloServerParams = {
  options: Omit<BuildSchemaOptions, 'skipCheck'>;
  config: {
    playground: boolean;
    plugins?: ApolloServerPlugin[];
  };
};

let schema: GraphQLSchema | undefined = undefined;
let cachedServer: ApolloServer | undefined = undefined;
export function createServer({ options, config }: CreateApolloServerParams) {
  schema ??= buildSchemaSync({
    ...options,
    skipCheck: true,
  });

  cachedServer ??= new ApolloServer({
    schema,
    allowBatchedHttpRequests: true,
    introspection: config.playground,
    plugins: [
      config.playground
        ? ApolloServerPluginLandingPageLocalDefault()
        : ApolloServerPluginLandingPageProductionDefault(),
      ...(config.plugins ?? []),
    ],
  });

  return cachedServer;
}
