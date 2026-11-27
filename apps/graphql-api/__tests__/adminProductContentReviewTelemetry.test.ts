import 'reflect-metadata';
import { HeaderMap, type ApolloServer } from '@apollo/server';
import type { PostgresqlProductContentReviews } from '@darun/products-datasource';
import { AuthRole, createAuthChecker, createServer } from '@darun/utils-apollo-server';
import { createSentryApolloLogPlugin, sentryRequestRedaction } from '@darun/utils-sentry';
import * as Sentry from '@sentry/node';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { AdminProductContentReviewsResolver } from '../src/app/graphql/AdminProductContentReviews.resolver';

const events: Sentry.Event[] = [];
let server: ApolloServer;

beforeAll(async () => {
  const resolver = new AdminProductContentReviewsResolver({
    async record({ memo, referenceUrl }) {
      throw Object.assign(new Error(`Synthetic review storage failure: ${memo} ${referenceUrl}`), {
        params: [memo, referenceUrl],
      });
    },
  } as PostgresqlProductContentReviews);
  Sentry.init({
    dsn: 'https://synthetic@telemetry.invalid/1',
    defaultIntegrations: false,
    integrations: [Sentry.extraErrorDataIntegration({ depth: 5 })],
    sendClientReports: false,
    skipOpenTelemetrySetup: true,
    transport: () => ({ send: vi.fn(async () => ({})), flush: async () => true }),
    ...sentryRequestRedaction,
    beforeSend: event => {
      events.push(sentryRequestRedaction.beforeSend(event));
      return null;
    },
  });
  server = createServer({
    options: {
      resolvers: [AdminProductContentReviewsResolver],
      container: { get: () => resolver },
      authChecker: createAuthChecker(),
    },
    config: { playground: false, plugins: [createSentryApolloLogPlugin()] },
  });
  await server.start();
});

afterAll(async () => {
  await server?.stop();
  await Sentry.close(2000);
});

it.each(['variables', 'inline', 'default', 'field defaults'] as const)(
  '검토 기록 %s 입력을 전송 전에 가린다',
  async encoding => {
    const memo = `private-review-${randomUUID()} 한글+`;
    const referenceUrl = `https://example.invalid/reference?ticket=${randomUUID()}`;
    const input = {
      productId: 'fixture',
      expectedRevision: '7',
      requestId: randomUUID(),
      memo: `  ${memo}\n`,
      referenceUrl: ` ${referenceUrl}\t`,
    };
    const nestedVariables = encoding === 'field defaults';
    const memoArgument = nestedVariables ? '$memo' : JSON.stringify(input.memo);
    const urlArgument = nestedVariables ? '$url' : JSON.stringify(input.referenceUrl);
    const literal = `{ productId: "fixture", expectedRevision: "7", requestId: "${input.requestId}", memo: ${memoArgument}, referenceUrl: ${urlArgument} }`;
    const literalInput = encoding === 'inline' || nestedVariables;
    const declaration = nestedVariables
      ? `($memo: String! = ${JSON.stringify(input.memo)}, $url: String = ${JSON.stringify(input.referenceUrl)})`
      : encoding === 'inline'
        ? ''
        : `($review: RecordAdminProductContentReviewInput!${encoding === 'default' ? ` = ${literal}` : ''})`;
    const body = {
      query: `mutation ReviewTelemetry${declaration} {
      recorded: recordAdminProductContentReview(input: ${literalInput ? literal : '$review'}) { id }
    }`,
      ...(encoding === 'variables' ? { variables: { review: input } } : {}),
    };
    events.length = 0;
    const url = 'http://127.0.0.1:7017/graphql';

    await Sentry.withIsolationScope(async scope => {
      scope.addEventProcessor(event => ({ ...event, request: { method: 'POST', url, data: body } }));
      const headers = new HeaderMap();
      headers.set('content-type', 'application/json');
      const response = await server.executeHTTPGraphQLRequest({
        httpGraphQLRequest: { method: 'POST', headers, search: '', body },
        context: async () => ({
          getRoles: async () => [AuthRole.Admin],
          getUserIdOrThrow: async () => 'fixture-reviewer',
        }),
      });
      if (response.body.kind !== 'complete') throw new Error('Expected a complete GraphQL response');
      expect(JSON.parse(response.body.string).errors[0]).toMatchObject({
        message: 'Internal server error',
        path: ['recorded'],
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
      await Sentry.flush(2000);
    });

    expect(events).toHaveLength(1);
    expect(events[0].request).toMatchObject({ method: 'POST', url });
    expect(events[0].request?.data).toBeUndefined();
    expect(events[0].extra?.query).toContain('ReviewTelemetry');
    expect(events[0].exception?.values?.[0].value).toContain('Synthetic review storage failure');
    const serialized = JSON.stringify(events[0]);
    for (const text of [input.memo, input.referenceUrl, memo, referenceUrl]) {
      expect(serialized).not.toContain(text);
      expect(serialized).not.toContain(encodeURIComponent(text));
      expect(serialized).not.toContain(JSON.stringify(text).slice(1, -1));
    }
  }
);
