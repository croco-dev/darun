import 'reflect-metadata';
import { HeaderMap, type ApolloServer } from '@apollo/server';
import type { PostgresqlProductContentReviews, PostgresqlProductUsageConditions } from '@darun/products-datasource';
import type { ReorderProductScreenshots } from '@darun/products-domain';
import { ProductScreenshotOrderMutationResolver } from '@darun/products-feature/server';
import { AuthRole, createAuthChecker, createServer } from '@darun/utils-apollo-server';
import { createSentryApolloLogPlugin, sentryRequestRedaction } from '@darun/utils-sentry';
import * as Sentry from '@sentry/node';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { AdminProductContentReviewsResolver } from '../src/app/graphql/AdminProductContentReviews.resolver';
import { AdminProductUsageConditionsResolver } from '../src/app/graphql/AdminProductUsageConditions.resolver';

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
  const conditions = new AdminProductUsageConditionsResolver({
    async save({ items }) {
      throw Object.assign(new Error(`Synthetic usage conditions storage failure: ${items[0].excerpt}`), {
        params: items,
      });
    },
  } as PostgresqlProductUsageConditions);
  const order = new ProductScreenshotOrderMutationResolver({
    async execute(productId, orderedIds, expectedOrderIds) {
      throw Object.assign(
        new Error(`Synthetic screenshot order storage failure: ${productId} ${orderedIds.join(',')}`),
        {
          params: { productId, orderedIds, expectedOrderIds },
        }
      );
    },
  } as ReorderProductScreenshots);
  const resolvers = new Map([
    [AdminProductContentReviewsResolver, resolver],
    [AdminProductUsageConditionsResolver, conditions],
    [ProductScreenshotOrderMutationResolver, order],
  ] as const);
  Sentry.init({
    dsn: 'https://synthetic@telemetry.invalid/1',
    defaultIntegrations: false,
    integrations: [Sentry.extraErrorDataIntegration({ depth: 5 })],
    sendClientReports: false,
    skipOpenTelemetrySetup: true,
    transport: () => ({ send: vi.fn(async () => ({})), flush: async () => true }),
    ...sentryRequestRedaction,
    beforeSend: event => {
      const redacted = sentryRequestRedaction.beforeSend(event);
      if (redacted) events.push(redacted);
      return null;
    },
  });
  server = createServer({
    options: {
      resolvers: [
        AdminProductContentReviewsResolver,
        AdminProductUsageConditionsResolver,
        ProductScreenshotOrderMutationResolver,
      ],
      container: { get: target => resolvers.get(target as Parameters<typeof resolvers.get>[0]) },
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

it.each(['variables', 'inline', 'default', 'field defaults', 'overlapping defaults'] as const)(
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
    const overlaps = encoding === 'overlapping defaults';
    const nestedVariables = encoding === 'field defaults' || overlaps;
    const memoArgument = nestedVariables ? '$memo' : JSON.stringify(input.memo);
    const urlArgument = nestedVariables ? '$url' : JSON.stringify(input.referenceUrl);
    const literal = `{ productId: "fixture", expectedRevision: "7", requestId: "${input.requestId}", memo: ${memoArgument}, referenceUrl: ${urlArgument} }`;
    const literalInput = encoding === 'inline' || nestedVariables;
    const declaration = nestedVariables
      ? `($memo: String! = ${JSON.stringify(input.memo)}, $url: String = ${JSON.stringify(input.referenceUrl)})`
      : encoding === 'inline'
        ? ''
        : `($review: RecordAdminProductContentReviewInput!${encoding === 'default' ? ` = ${literal}` : ''})`;
    const unselectedOperation = overlaps
      ? 'mutation Other($memo: ID! = 71358129) { reorderProductScreenshots(productId: $memo, orderedIds: [], expectedOrderIds: []) }'
      : '';
    const body = {
      query: `mutation ReviewTelemetry${declaration} {
      recorded: recordAdminProductContentReview(input: ${literalInput ? literal : '$review'}) { id }
    } ${unselectedOperation}`,
      ...(overlaps && { operationName: 'ReviewTelemetry' }),
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

it('redacts integer IDs in copied diagnostic data while preserving unrelated numbers', () => {
  const product = 71358129;
  const screenshot = 82936576;
  const request = {
    method: 'POST',
    data: {
      query: `mutation ScreenshotOrder($product: ID!, $screenshots: [ID!]!) {
        reorderProductScreenshots(productId: $product, orderedIds: $screenshots, expectedOrderIds: $screenshots)
      }`,
      variables: { product, screenshots: [screenshot] },
    },
  };
  const event = sentryRequestRedaction.beforeSend({
    request,
    extra: { product, screenshots: [screenshot], status: 17 },
  });
  expect(event?.extra).toEqual({ product: '[REDACTED]', screenshots: ['[REDACTED]'], status: 17 });
  const transaction = sentryRequestRedaction.beforeSendTransaction({
    request,
    type: 'transaction',
    contexts: { trace: { data: { product, screenshots: [screenshot], status: 17 } } },
  });
  expect(transaction?.contexts?.trace?.data).toEqual({
    product: '[REDACTED]',
    screenshots: ['[REDACTED]'],
    status: 17,
  });
});

it.each([
  {
    product: 'fixture-product',
    ordered: Array.from({ length: 256 }, (_, index) => `fixture-screen-${index}`),
    expected: ['fixture-screen'],
  },
  { product: 'a'.repeat(8193), ordered: ['fixture-screen'], expected: ['fixture-screen'] },
])('drops over-budget screenshot order diagnostics without changing the authorization error', async variables => {
  const query = `mutation ScreenshotOrder($product: ID!, $ordered: [ID!]!, $expected: [ID!]!) {
    reorderProductScreenshots(productId: $product, orderedIds: $ordered, expectedOrderIds: $expected)
  }`;
  events.length = 0;
  const response = await server.executeOperation({ query, variables }, { contextValue: { getRoles: async () => [] } });
  if (response.body.kind !== 'single') throw new Error('Expected a single GraphQL response');
  expect(response.body.singleResult.errors?.[0]?.extensions?.code).toBe('UNAUTHORIZED');
  await Sentry.flush(2000);
  expect(events).toHaveLength(0);

  const request = { method: 'POST', data: { query, variables } };
  expect(sentryRequestRedaction.beforeSend({ request, message: 'Storage failure' })).toBeNull();
  expect(sentryRequestRedaction.beforeSendTransaction({ request, type: 'transaction' })).toBeNull();
});

it.each(['variables', 'inline', 'default'] as const)('사용 조건의 %s 입력을 전송 전에 가린다', async encoding => {
  const excerpt = `private-condition-${randomUUID()} 한글+`;
  const input = {
    productId: 'fixture-product',
    items: [
      {
        statement: 'iOS 18에서 지원합니다.',
        sourceUrl: 'https://example.com/help',
        excerpt,
        checkedOn: '2026-11-28',
      },
    ],
  };
  const literal = `{ productId: "fixture-product", items: [{statement: "iOS 18에서 지원합니다.", sourceUrl: "https://example.com/help", excerpt: ${JSON.stringify(excerpt)}, checkedOn: "2026-11-28"}] }`;
  const body = {
    query: `mutation UsageConditionsTelemetry${encoding === 'inline' ? '' : `($input: SaveAdminProductUsageConditionsInput!${encoding === 'default' ? ` = ${literal}` : ''})`} {
      saved: saveAdminProductUsageConditions(input: ${encoding === 'inline' ? literal : '$input'}) { revision }
    }`,
    ...(encoding === 'variables' ? { variables: { input } } : {}),
  };
  events.length = 0;
  await Sentry.withIsolationScope(async scope => {
    scope.addEventProcessor(event => ({ ...event, request: { method: 'POST', data: body } }));
    const headers = new HeaderMap();
    headers.set('content-type', 'application/json');
    const response = await server.executeHTTPGraphQLRequest({
      httpGraphQLRequest: { method: 'POST', headers, search: '', body },
      context: async () => ({ getRoles: async () => [AuthRole.Admin], getUserIdOrThrow: async () => 'fixture-editor' }),
    });
    if (response.body.kind !== 'complete') throw new Error('Expected a complete GraphQL response');
    expect(JSON.parse(response.body.string).errors[0].extensions.code).toBe('INTERNAL_SERVER_ERROR');
    await Sentry.flush(2000);
  });
  expect(events).toHaveLength(1);
  expect(events[0].extra?.query).toContain('UsageConditionsTelemetry');
  expect(events[0].exception?.values?.[0].value).toContain('Synthetic usage conditions storage failure');
  expect(JSON.stringify(events[0])).not.toContain(excerpt);
});

it.each(['variables', 'inline', 'integer variables', 'integer inline', 'integer defaults'] as const)(
  '스크린샷 순서의 %s 입력을 전송 전에 가린다',
  async encoding => {
    const integers = encoding.startsWith('integer');
    const productId = integers ? 71358129 : `private-product-${randomUUID()}`;
    const first = integers ? 82936576 : `private-first-${randomUUID()}`;
    const second = integers ? 65184972 : `private-second-${randomUUID()}`;
    const variables = { product: productId, next: [second, first], before: [first, second] };
    const inline = encoding.endsWith('inline');
    const defaults = encoding.endsWith('defaults');
    const declaration = inline
      ? ''
      : `($product: ID!${defaults ? ` = ${productId}` : ''}, $next: [ID!]!${defaults ? ` = ${JSON.stringify(variables.next)}` : ''}, $before: [ID!]!${defaults ? ` = ${JSON.stringify(variables.before)}` : ''})`;
    const body = {
      query: `mutation ScreenshotOrderTelemetry${declaration} {
      saved: reorderProductScreenshots(
        productId: ${inline ? JSON.stringify(variables.product) : '$product'}
        orderedIds: ${inline ? JSON.stringify(variables.next) : '$next'}
        expectedOrderIds: ${inline ? JSON.stringify(variables.before) : '$before'}
      )
    }`,
      ...(!inline && !defaults && { variables }),
    };

    events.length = 0;
    await Sentry.withIsolationScope(async scope => {
      scope.addEventProcessor(event => ({ ...event, request: { method: 'POST', data: body } }));
      const headers = new HeaderMap();
      headers.set('content-type', 'application/json');
      const response = await server.executeHTTPGraphQLRequest({
        httpGraphQLRequest: { method: 'POST', headers, search: '', body },
        context: async () => ({ getRoles: async () => [AuthRole.Admin] }),
      });
      if (response.body.kind !== 'complete') throw new Error('Expected a complete GraphQL response');
      expect(JSON.parse(response.body.string).errors[0].extensions.code).toBe('INTERNAL_SERVER_ERROR');
      await Sentry.flush(2000);
    });

    expect(events).toHaveLength(1);
    expect(events[0].extra?.query).toContain('ScreenshotOrderTelemetry');
    expect(events[0].exception?.values?.[0].value).toContain('Synthetic screenshot order storage failure');
    const serialized = JSON.stringify(events[0]);
    for (const id of [productId, first, second]) expect(serialized).not.toContain(String(id));
  }
);
