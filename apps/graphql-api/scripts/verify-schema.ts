import 'reflect-metadata';
import { createAuthChecker } from '@darun/utils-apollo-server';
import {
  buildSchema,
  concatAST,
  graphql,
  lexicographicSortSchema,
  parse,
  printSchema,
  Source,
  validate,
} from 'graphql';
import { buildSchemaSync, GraphQLISODateTime } from 'type-graphql';
import { Container } from 'typedi';
import { readFileSync } from 'node:fs';
import { resolvers } from '../src/app/resolvers';

async function main() {
  const schema = buildSchemaSync({
    resolvers,
    container: Container,
    authChecker: createAuthChecker(),
    scalarsMap: [{ type: Date, scalar: GraphQLISODateTime }],
    emitSchemaFile: process.argv.includes('--emit-schema') ? 'schema.graphql' : false,
  });
  const documents: { location: string; source: string }[] = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  if (documents.length === 0) {
    throw new Error('Codegen consumer document closure is empty or contains an unparsed document');
  }
  const consumerDocument = concatAST(documents.map(document => parse(new Source(document.source, document.location))));
  const operationNames = new Set(
    consumerDocument.definitions.flatMap(definition =>
      definition.kind === 'OperationDefinition' && definition.name ? [definition.name.value] : []
    )
  );
  for (const name of ['CreateProductOnNewProductForm', 'PublishProductOnPublishProductButton', 'SignImageUpload']) {
    if (!operationNames.has(name)) throw new Error(`Required consumer operation was not loaded: ${name}`);
  }
  const storedSchema = buildSchema(readFileSync('schema.graphql', 'utf8'));
  for (const [name, contractSchema] of [
    ['runtime', schema],
    ['stored SDL', storedSchema],
  ] as const) {
    const documentErrors = validate(contractSchema, consumerDocument);
    if (documentErrors.length > 0) {
      throw new Error(
        `${name} consumer document validation failed: ${documentErrors.map(error => error.toString()).join('\n')}`
      );
    }
  }
  if (printSchema(lexicographicSortSchema(schema)) !== printSchema(lexicographicSortSchema(storedSchema))) {
    throw new Error('Stored SDL differs from the full resolver runtime schema; regenerate it with --emit-schema');
  }
  console.log(
    `Validated ${operationNames.size} consumer operations and all fragments from ${documents.length} documents against runtime and stored SDL`
  );
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
