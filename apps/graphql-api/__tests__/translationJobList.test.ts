import 'reflect-metadata';
import { PostgresqlTranslationJobRepository } from '@darun/translation-datasource';
import { TranslationQueryResolver } from '@darun/translation-feature/server';
import { TranslationJobService } from '@darun/translation-service';
import { createServer } from '@darun/utils-apollo-server';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const query = `query Jobs($status: String, $limit: Int, $offset: Int) {
  translationJobs(status: $status, limit: $limit, offset: $offset) { id status fields }
}`;

describe('translation job list input through GraphQL, service and SQL', () => {
  const execute = vi.fn(async (_sql: string, _params: unknown[]) => ({ rows: [] }));
  const repository = new PostgresqlTranslationJobRepository(drizzle(execute) as never);
  const service = new TranslationJobService({} as never, {} as never, repository, {} as never, {} as never);
  const getJobs = vi.spyOn(service, 'getJobs');
  const resolver = new TranslationQueryResolver(service, {} as never, {} as never);
  const server = createServer({
    options: {
      resolvers: [TranslationQueryResolver],
      container: { get: () => resolver },
      authChecker: ({ context }) => context.admin === true,
    },
    config: { playground: false },
  });

  beforeAll(() => server.start());
  afterAll(() => server.stop());
  beforeEach(() => {
    execute.mockClear();
    getJobs.mockClear();
  });

  async function request(variables: Record<string, unknown>, admin = true) {
    const result = await server.executeOperation({ query, variables }, { contextValue: { admin } });
    if (result.body.kind !== 'single') throw new Error('Expected a single GraphQL response');
    return result.body.singleResult;
  }

  it.each([
    { limit: -1 },
    { limit: 0 },
    { limit: 101 },
    { limit: 1_000_000 },
    { offset: -1 },
    { status: 'not-a-state' },
    { status: '' },
    { status: 'FAILED' },
  ])('rejects invalid arguments %j before the service and SQL', async variables => {
    const result = await request(variables);
    expect(result.errors).toHaveLength(1);
    expect(result.errors![0].extensions).toEqual({ code: 'translation/invalid-job-list-args' });
    expect(result.errors![0].message).not.toContain('not-a-state');
    expect(getJobs).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it.each([
    [{}, [50]],
    [{ status: null, limit: null, offset: null }, [50]],
    [{ limit: 1, offset: 0 }, [1]],
    [{ limit: 100, offset: 7 }, [100, 7]],
  ])('applies defaults and valid pagination %j to actual SQL', async (variables, params) => {
    const result = await request(variables);
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ translationJobs: [] });
    expect(execute).toHaveBeenCalledTimes(1);
    const [sql, actualParams] = execute.mock.calls[0]!;
    expect(sql).toContain('order by "translation_jobs"."created_at" desc limit $1');
    expect(actualParams).toEqual(params);
  });

  it.each(['pending', 'in_progress', 'completed', 'failed', 'superseded'])(
    'keeps the %s status filter in the actual SQL',
    async status => {
      expect((await request({ status, limit: 100 })).errors).toBeUndefined();
      const [sql, params] = execute.mock.calls[0]!;
      expect(sql).toContain('where "translation_jobs"."status" = $1');
      expect(params).toEqual([status, 100]);
    }
  );

  it('keeps the administrator authorization before any list query', async () => {
    expect((await request({}, false)).errors).toHaveLength(1);
    expect(getJobs).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it.each([
    { limit: -1 },
    { limit: 0 },
    { limit: 101 },
    { limit: 1.5 },
    { limit: NaN },
    { limit: Infinity },
    { offset: -1 },
    { offset: 0.5 },
    { offset: NaN },
    { offset: Infinity },
    { offset: Number.MAX_SAFE_INTEGER + 1 },
    { status: 'not-a-state' },
  ])('defends direct repository calls with %j without executing SQL', async options => {
    await expect(repository.findJobs(options as never)).rejects.toMatchObject({
      code: 'translation/invalid-job-list-args',
    });
    expect(execute).not.toHaveBeenCalled();
  });
});
