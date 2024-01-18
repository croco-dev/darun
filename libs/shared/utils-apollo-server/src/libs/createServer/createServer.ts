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

let schema: GraphQLSchema | null = null;
let cachedServer: ApolloServer | null = null;
export function createServer({ options, config }: CreateApolloServerParams) {
  schema ??= buildSchemaSync({
    ...options,
    skipCheck: true,
  });

  cachedServer ??= new ApolloServer({
    schema,
    introspection: config.playground,
    plugins: [
      config.playground
        ? ApolloServerPluginLandingPageLocalDefault({
            footer: false,
            embed: {
              initialState: {
                pollForSchemaUpdates: false,
              },
            },
          })
        : ApolloServerPluginLandingPageProductionDefault({ footer: false }),
      ...(config.plugins ?? []),
    ],
  });

  return cachedServer;
}
