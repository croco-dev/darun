import 'reflect-metadata';
import { createAuthChecker } from '@darun/utils-apollo-server';
import { graphql } from 'graphql';
import { buildSchemaSync, GraphQLISODateTime } from 'type-graphql';
import { Container } from 'typedi';
import { resolvers } from '../src/app/resolvers';

async function main() {
  const schema = buildSchemaSync({
    resolvers,
    container: Container,
    authChecker: createAuthChecker(),
    scalarsMap: [{ type: Date, scalar: GraphQLISODateTime }],
  });
  const result = await graphql({
    schema,
    source: 'query { __typename hello }',
  });
  if (result.errors || result.data?.hello !== 'Hello World!') {
    throw new Error(`GraphQL schema smoke check failed: ${JSON.stringify(result)}`);
  }
  console.log('Full GraphQL schema and health query verified');
}

main().then(
  () => process.exit(0),
  error => {
    console.error(error);
    process.exit(1);
  }
);
