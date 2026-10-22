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
import { text } from 'node:stream/consumers';
import { resolvers } from '../src/app/resolvers';

async function main() {
  const schema = buildSchemaSync({
    resolvers,
    container: Container,
    authChecker: createAuthChecker(),
    scalarsMap: [{ type: Date, scalar: GraphQLISODateTime }],
    emitSchemaFile: process.argv.includes('--emit-schema') ? 'schema.graphql' : false,
  });
  let documents: { location: string; source: string }[];
  try {
    documents = JSON.parse(await text(process.stdin));
  } catch {
    throw new Error('Consumer documents must be provided as JSON on stdin');
  }
  if (
    !Array.isArray(documents) ||
    documents.length === 0 ||
    documents.some(
      document => !document || typeof document.location !== 'string' || typeof document.source !== 'string'
    )
  ) {
    throw new Error('Codegen consumer document closure is empty or contains an unparsed document');
  }
  const consumerDocument = concatAST(
    documents.map((document, index) => {
      try {
        return parse(new Source(document.source, document.location));
      } catch {
        throw new Error(`Consumer document ${index + 1} has invalid GraphQL syntax`);
      }
    })
  );
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
      // GraphQL 오류에 원문이나 literal이 포함될 수 있으므로 위치만 보고합니다.
      const failures = documentErrors.map(error => {
        const sourceName = error.nodes?.[0]?.loc?.source.name;
        const documentNumber = documents.findIndex(document => document.location === sourceName) + 1;
        const positions = error.locations?.map(({ line, column }) => `${line}:${column}`).join(', ') ?? 'unknown';
        return `document ${documentNumber}, positions ${positions}`;
      });
      throw new Error(`${name} consumer document validation failed: ${failures.join('; ')}`);
    }
  }
  if (printSchema(lexicographicSortSchema(schema)) !== printSchema(lexicographicSortSchema(storedSchema))) {
    throw new Error('Stored SDL differs from the full resolver runtime schema; regenerate it with --emit-schema');
  }
  console.log('All consumer operations and fragments verified against runtime and stored SDL');
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
