import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from '@apollo/client';
import { GetProductDescriptionJobsOnAdminDocument, GetTranslationJobsOnAdminDocument } from '@darun/provider-graphql';
import { describe, expect, it, vi } from 'vitest';
import { llmJobHistoryCompatibility } from '../features/llm-jobs/llmJobHistoryCompatibility';

const lists = [
  {
    query: GetTranslationJobsOnAdminDocument,
    field: 'translationJobPage',
    legacy: 'translationJobs',
    name: 'GetTranslationJobsOnAdmin',
    legacyName: 'GetLegacyTranslationJobsOnAdmin',
    kind: 'TranslationJob',
    details: { entityType: 'Product', entityId: 'product', locale: 'en', model: null },
  },
  {
    query: GetProductDescriptionJobsOnAdminDocument,
    field: 'productDescriptionJobPage',
    legacy: 'productDescriptionJobs',
    name: 'GetProductDescriptionJobsOnAdmin',
    legacyName: 'GetLegacyProductDescriptionJobsOnAdmin',
    kind: 'ProductDescriptionJob',
    details: { productId: 'product', productSlug: 'product', writerModel: null, reviewerModel: null },
  },
] as const;

function setup(list: (typeof lists)[number]) {
  let schemaUpdated = false;
  let failCurrent = false;
  const rows = Array.from({ length: 3 }, (_, i) => ({
    __typename: list.kind,
    id: `job-${i}`,
    status: 'failed',
    message: null,
    error: null,
    createdAt: '2026-11-24T12:00:00Z',
    updatedAt: '2026-11-24T12:00:00Z',
    ...list.details,
  }));
  const request = vi.fn<typeof fetch>(async (_url, init) => {
    const { operationName, variables, query } = JSON.parse(init?.body as string);
    if (operationName === list.legacyName) {
      expect(query).toContain(`${list.legacy}(status: $status, limit: $limit, offset: $offset)`);
      const { limit, offset } = variables;
      const requestedTypeName = /\b__typename\b/.test(query);
      const selected = rows
        .slice(offset, offset + limit)
        .map(({ __typename, ...fields }) => (requestedTypeName ? { ...fields, __typename } : fields));
      return Response.json({ data: { [list.legacy]: selected } });
    }
    expect(operationName).toBe(list.name);
    if (failCurrent) {
      return Response.json({ errors: [{ message: 'Unavailable', extensions: { code: 'database/read-unavailable' } }] });
    }
    if (!schemaUpdated) {
      return Response.json(
        {
          errors: [
            {
              message: `Cannot query field "${list.field}" on type "Query". Did you mean "${list.legacy}"?`,
              extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
            },
          ],
        },
        { status: 400 }
      );
    }
    expect(variables.after).toBeUndefined();
    return Response.json({ data: { [list.field]: { jobs: rows.slice(0, 2), nextCursor: 'signed-cursor' } } });
  });
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: ApolloLink.from([
      llmJobHistoryCompatibility,
      new HttpLink({ uri: 'http://localhost/graphql', fetch: request }),
    ]),
  });
  const read = async (after?: string) => {
    const { data } = await client.query({
      query: list.query as typeof GetTranslationJobsOnAdminDocument,
      variables: { status: 'failed', first: 2, after },
      fetchPolicy: 'network-only',
    });
    return (data as Record<string, { jobs: unknown[]; nextCursor: string | null }> | undefined)?.[list.field];
  };
  const operations = () =>
    request.mock.calls.map(([, init]) => {
      const { operationName, variables } = JSON.parse(init?.body as string);
      return { operationName, variables };
    });
  return {
    read,
    operations,
    upgrade: () => (schemaUpdated = true),
    fail: () => (failCurrent = true),
    stop: () => client.stop(),
  };
}

describe.each(lists)('$field schema compatibility through HTTP', list => {
  it('keeps an old-server list usable, then refreshes against the new schema', async () => {
    const fixture = setup(list);
    try {
      const first = await fixture.read();
      expect(first?.jobs).toMatchObject([{ id: 'job-0' }, { id: 'job-1' }]);
      expect(first?.nextCursor).toBeTruthy();
      fixture.upgrade();
      const next = await fixture.read(first!.nextCursor!);
      expect(next).toMatchObject({ jobs: [{ id: 'job-2' }], nextCursor: null });
      expect((await fixture.read())?.nextCursor).toBe('signed-cursor');
      expect(fixture.operations()).toEqual([
        { operationName: list.name, variables: { status: 'failed', first: 2 } },
        { operationName: list.legacyName, variables: { status: 'failed', limit: 2, offset: 0 } },
        { operationName: list.legacyName, variables: { status: 'failed', limit: 2, offset: 2 } },
        { operationName: list.name, variables: { status: 'failed', first: 2 } },
      ]);
    } finally {
      fixture.stop();
    }
  });

  it('preserves execution errors and never translates a server-issued cursor into an offset', async () => {
    const fixture = setup(list);
    try {
      await expect(fixture.read('signed-cursor')).rejects.toMatchObject({ statusCode: 400 });
      fixture.fail();
      await expect(fixture.read()).rejects.toThrow('Unavailable');
      expect(fixture.operations().map(operation => operation.operationName)).toEqual([list.name, list.name]);
    } finally {
      fixture.stop();
    }
  });
});
