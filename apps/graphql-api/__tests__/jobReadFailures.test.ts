import 'reflect-metadata';
import { PostgresqlProductDescriptionJobRepository } from '@darun/products-datasource';
import { ProductDescriptionQueryResolver } from '@darun/products-feature/server';
import { ProductDescriptionJobService } from '@darun/products-service';
import { databaseReadFailed } from '@darun/provider-database';
import { PostgresqlTranslationJobRepository } from '@darun/translation-datasource';
import { TranslationQueryResolver } from '@darun/translation-feature/server';
import { TranslationJobService } from '@darun/translation-service';
import { createServer } from '@darun/utils-apollo-server';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

describe('job reads through GraphQL, services and actual Drizzle queries', () => {
  let failure: unknown;
  const execute = vi.fn(async (_sql: string, _params: unknown[]) => {
    if (failure) throw failure;
    return { rows: [] };
  });
  const db = drizzle(execute);
  const descriptions = new PostgresqlProductDescriptionJobRepository(db as never);
  const translations = new PostgresqlTranslationJobRepository(db as never);
  const sendJob = vi.fn();
  const createRetryJob = vi.fn();
  const descriptionService = new ProductDescriptionJobService({} as never, {} as never, descriptions, {
    sendJob,
  } as never);
  const translationService = new TranslationJobService(
    {} as never,
    {} as never,
    translations,
    { createRetryJob } as never,
    { sendJob } as never
  );
  const descriptionResolver = new ProductDescriptionQueryResolver(descriptionService, {} as never, {} as never);
  const translationResolver = new TranslationQueryResolver(translationService, {} as never, {} as never);
  const server = createServer({
    options: {
      resolvers: [ProductDescriptionQueryResolver, TranslationQueryResolver],
      container: {
        get: target => (target === ProductDescriptionQueryResolver ? descriptionResolver : translationResolver),
      },
      authChecker: ({ context }) => context.admin === true,
    },
    config: { playground: false },
  });
  beforeAll(() => server.start());
  afterAll(() => server.stop());
  beforeEach(() => {
    failure = undefined;
    vi.clearAllMocks();
  });
  const queries = [
    ['translationJob', 'translationJob(id: "missing") { id }', null],
    ['translationJobs', 'translationJobs { id }', []],
    ['productDescriptionJob', 'productDescriptionJob(id: "missing") { id }', null],
    ['productDescriptionJobs', 'productDescriptionJobs { id }', []],
  ] as const;
  async function request(selection: string, admin = true) {
    const result = await server.executeOperation({ query: `{ ${selection} }` }, { contextValue: { admin } });
    if (result.body.kind !== 'single') throw new Error('Expected single response');
    return result.body.singleResult;
  }
  it.each(queries)('%s preserves actual row absence', async (field, selection, empty) => {
    const result = await request(selection);
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ [field]: empty });
    expect(execute).toHaveBeenCalledTimes(1);
  });
  describe.each(queries)('%s read failures', (field, selection, empty) => {
    it.each([
      ['ECONNREFUSED', 'database/read-unavailable'],
      ['ETIMEDOUT', 'database/read-unavailable'],
      ['CONNECT_TIMEOUT', 'database/read-unavailable'],
      ['CONNECTION_CLOSED', 'database/read-unavailable'],
      ['08006', 'database/read-unavailable'],
      ['57014', 'database/read-unavailable'],
      ['42P01', 'database/read-schema-invalid'],
      ['42703', 'database/read-schema-invalid'],
      ['XX000', 'database/read-failed'],
    ])('returns safe %s errors and recovers with a read only', async (code, expectedCode) => {
      failure = Object.assign(new Error('private SQL select secret_column; parameter=private-value'), { code });
      const result = await request(selection);
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].extensions).toEqual({ code: expectedCode });
      expect(result.errors![0].path).toEqual([field]);
      expect(JSON.stringify(result)).not.toContain('secret_column');
      expect(JSON.stringify(result)).not.toContain('private-value');
      expect(result.errors![0].message).not.toContain('존재하지');
      failure = undefined;
      const recovered = await request(selection);
      expect(recovered.errors).toBeUndefined();
      expect(recovered.data).toEqual({ [field]: empty });
      expect(execute).toHaveBeenCalledTimes(2);
      expect(execute.mock.calls.every(([sql]) => sql.startsWith('select '))).toBe(true);
      expect(sendJob).not.toHaveBeenCalled();
      expect(createRetryJob).not.toHaveBeenCalled();
    });
  });
  it.each([
    ['description', () => descriptionService.retryProductDescriptionJob('missing')],
    ['translation', () => translationService.retryProductTranslationJob('missing')],
  ])('%s retry never creates or dispatches work after a failed read', async (_kind, retry) => {
    failure = Object.assign(new Error('private database failure'), {
      code: 'ECONNRESET',
    });
    await expect(retry()).rejects.toMatchObject({
      code: 'database/read-unavailable',
    });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0]![0]).toMatch(/^select /);
    expect(createRetryJob).not.toHaveBeenCalled();
    expect(sendJob).not.toHaveBeenCalled();
  });
  it.each(queries)('%s keeps admin authorization before SQL', async (_field, selection) => {
    expect((await request(selection, false)).errors).toHaveLength(1);
    expect(execute).not.toHaveBeenCalled();
  });
});

// Drizzle wraps driver errors in a cause; a cyclic/unknown cause must still fail safely.
it('classifies nested driver codes without retaining raw diagnostic data', () => {
  const source = Object.assign(new Error('private SQL and parameter'), {
    code: '42703',
  });
  const result = databaseReadFailed(new Error('private query wrapper', { cause: source }));
  expect(result.code).toBe('database/read-schema-invalid');
  expect(result).not.toHaveProperty('cause', source);
  expect((result as Error & { cause?: unknown }).cause).toBeUndefined();
  expect(String(result)).not.toContain('private');
  const cyclic: { cause?: unknown } = {};
  cyclic.cause = cyclic;
  expect(databaseReadFailed(cyclic).code).toBe('database/read-failed');
  expect(databaseReadFailed('ECONNREFUSED private-value').code).toBe('database/read-failed');
});
