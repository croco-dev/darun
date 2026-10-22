import 'reflect-metadata';
import { createAuthChecker } from '@darun/utils-apollo-server';
import { buildSchema, graphql, lexicographicSortSchema, printSchema } from 'graphql';
import { buildSchemaSync, GraphQLISODateTime } from 'type-graphql';
import { Container } from 'typedi';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolvers } from '../src/app/resolvers';

async function main() {
  const schema = buildSchemaSync({
    resolvers,
    container: Container,
    authChecker: createAuthChecker(),
    scalarsMap: [{ type: Date, scalar: GraphQLISODateTime }],
  });
  const snapshot = buildSchema(readFileSync(resolve('schema.graphql'), 'utf8'));
  const runtimeSDL = printSchema(lexicographicSortSchema(schema));
  const snapshotSDL = printSchema(lexicographicSortSchema(snapshot));
  if (runtimeSDL !== snapshotSDL) {
    throw new Error(
      'GraphQL schema drift: schema.graphql does not match the runtime resolver schema. Regenerate and review the committed SDL before verifying Lambda.'
    );
  }
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
