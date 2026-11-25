import 'reflect-metadata';
import { ApolloServer, HeaderMap } from '@apollo/server';
import * as Sentry from '@sentry/node';
import { expect, it, vi } from 'vitest';
import {
  productDescriptionEditConflict,
  productDescriptionInvalidEditPrecondition,
} from '../../../libs/products/domain/src/errors/productDescriptionError';
import { formatServerError } from '../../../libs/shared/utils-apollo-server/src/libs/createServer/formatError';
import { createGraphQLDescriptionPrecondition } from '../src/app/graphqlDescriptionPrecondition';
import { createGraphQLDiagnostics } from '../src/app/graphqlDiagnostics';
import { screenshotRegistrationPlugin } from '../src/functions/context';

it.each([false, true])('새 요청은 구·신 API에서 처리되고 배치 내 편집 기준은 요청마다 격리된다 (%s)', async enabled => {
  const server = new ApolloServer({
    typeDefs: 'type Query { health: Boolean } type Mutation { save: String, screenshotRegistration: String }',
    resolvers: {
      Mutation: {
        save: (_root: unknown, _args: unknown, { expectedDescriptionHash }: { expectedDescriptionHash?: unknown }) => {
          if (expectedDescriptionHash === null) return 'absent description';
          if (expectedDescriptionHash === undefined) return 'none';
          return typeof expectedDescriptionHash === 'string' ? expectedDescriptionHash : 'invalid precondition';
        },
        screenshotRegistration: (
          _root: unknown,
          _args: unknown,
          { screenshotRegistrationId }: { screenshotRegistrationId?: unknown }
        ) => (typeof screenshotRegistrationId === 'string' ? screenshotRegistrationId : 'none'),
      },
    },
    allowBatchedHttpRequests: true,
    plugins: enabled
      ? [createGraphQLDescriptionPrecondition(), screenshotRegistrationPlugin]
      : [screenshotRegistrationPlugin],
  });
  const query = 'mutation { save screenshotRegistration }';
  const hash = 'a'.repeat(64);
  try {
    await server.start();
    const response = await server.executeHTTPGraphQLRequest({
      context: async () => ({}),
      httpGraphQLRequest: {
        method: 'POST',
        headers: new HeaderMap([['content-type', 'application/json']]),
        search: '',
        body: [
          { query, extensions: { darunExpectedDescriptionHash: hash } },
          { query, extensions: { darunExpectedDescriptionHash: { malformed: true } } },
          { query, extensions: { screenshotRegistrationId: 'test-registration-id' } },
          { query, extensions: { darunExpectedDescriptionHash: null } },
        ],
      },
    });
    if (response.body.kind !== 'complete') throw new Error('Expected a complete batch response');
    expect(response.status ?? 200).toBe(200);
    expect(JSON.parse(response.body.string)).toEqual([
      { data: { save: enabled ? hash : 'none', screenshotRegistration: 'none' } },
      { data: { save: enabled ? 'invalid precondition' : 'none', screenshotRegistration: 'none' } },
      { data: { save: 'none', screenshotRegistration: 'test-registration-id' } },
      { data: { save: enabled ? 'absent description' : 'none', screenshotRegistration: 'none' } },
    ]);
  } finally {
    await server.stop();
  }
});

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
          if (draft === 'invalid-precondition-fixture') throw productDescriptionInvalidEditPrecondition();
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
    expect((await save('invalid-precondition-fixture')).errors?.[0]?.extensions?.code).toBe(
      'INVALID_DESCRIPTION_EDIT_PRECONDITION'
    );
    expect(sent).not.toHaveBeenCalled();
    expect((await save('unexpected-failure-fixture')).errors?.[0]?.extensions?.code).toBe('INTERNAL_SERVER_ERROR');
    expect(sent).toHaveBeenCalledTimes(1);
  } finally {
    await server.stop();
    await Sentry.close(2000);
  }
});

it('관리자 작업의 이어 읽기 커서를 Sentry 이벤트에 남기지 않는다', async () => {
  const sent = vi.fn(async () => ({}));
  Sentry.init({
    dsn: 'https://fixture@telemetry.invalid/1',
    defaultIntegrations: false,
    sendClientReports: false,
    skipOpenTelemetrySetup: true,
    transport: () => ({ send: sent, flush: async () => true }),
  });
  const read = () => {
    throw new Error('Unexpected read failure');
  };
  const server = new ApolloServer({
    typeDefs: `type Query {
      translationJobPage(after: String): String
      productDescriptionJobPage(after: String): String
      otherPage(after: String): String
    }`,
    resolvers: { Query: { translationJobPage: read, productDescriptionJobPage: read, otherPage: read } },
    plugins: [createGraphQLDiagnostics()],
    formatError: (formatted, error) => formatServerError(formatted, error, false),
  });
  try {
    await server.start();
    const output = await server.executeOperation({
      query: `query Continuations($boundary: String) {
        translations: translationJobPage(after: $boundary)
        descriptions: productDescriptionJobPage(after: "private-description-position")
        otherPage(after: "public-position")
      }`,
      variables: { boundary: 'private-translation-position' },
    });
    if (output.body.kind !== 'single') throw new Error('Expected a single GraphQL response');
    expect(output.body.singleResult.errors).toHaveLength(3);
    expect(await Sentry.flush(2000)).toBe(true);
    expect(sent).toHaveBeenCalledTimes(3);
    const envelopes = JSON.stringify(sent.mock.calls);
    expect(envelopes).not.toContain('private-translation-position');
    expect(envelopes).not.toContain('private-description-position');
    expect(envelopes).toContain('public-position');
    expect(envelopes).toContain('[REDACTED]');
  } finally {
    await server.stop();
    await Sentry.close(2000);
  }
});
