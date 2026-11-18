import 'reflect-metadata';
import { ApolloServer } from '@apollo/server';
import * as Sentry from '@sentry/node';
import { expect, it, vi } from 'vitest';
import { productDescriptionEditConflict } from '../../../libs/products/domain/src/errors/productDescriptionError';
import { formatServerError } from '../../../libs/shared/utils-apollo-server/src/libs/createServer/formatError';
import { createGraphQLDiagnostics } from '../src/app/graphqlDiagnostics';

it('소개 편집 충돌은 응답으로만 전달하고 예상 밖 오류는 진단에 남긴다', async () => {
  const sent = vi.fn(async () => ({}));
  Sentry.init({
    dsn: 'https://fixture@telemetry.invalid/1',
    defaultIntegrations: false,
    sendClientReports: false,
    skipOpenTelemetrySetup: true,
    transport: () => ({ send: sent, flush: async () => true }),
  });
  const server = new ApolloServer({
    typeDefs: 'type Query { health: Boolean } type Mutation { save(draft: String!): String }',
    resolvers: {
      Mutation: {
        save: (_: unknown, { draft }: { draft: string }) => {
          if (draft === 'submitted-draft-fixture') throw productDescriptionEditConflict();
          throw new Error('Unexpected resolver failure');
        },
      },
    },
    plugins: [createGraphQLDiagnostics()],
    formatError: (formatted, error) => formatServerError(formatted, error, false),
  });
  const save = async (draft: string) => {
    const response = await server.executeOperation({
      query: 'mutation ($draft: String!) { save(draft: $draft) }',
      variables: { draft },
    });
    if (response.body.kind !== 'single') throw new Error('Expected a single GraphQL response');
    await Sentry.flush(2000);
    return response.body.singleResult;
  };
  try {
    expect((await save('submitted-draft-fixture')).errors?.[0]?.extensions?.code).toBe('DESCRIPTION_EDIT_CONFLICT');
    expect(sent).not.toHaveBeenCalled();
    expect((await save('unexpected-failure-fixture')).errors?.[0]?.extensions?.code).toBe('INTERNAL_SERVER_ERROR');
    expect(sent).toHaveBeenCalledTimes(1);
  } finally {
    await server.stop();
    await Sentry.close(2000);
  }
});
