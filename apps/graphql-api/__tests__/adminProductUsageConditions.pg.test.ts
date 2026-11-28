import 'reflect-metadata';
import {
  PostgresqlProductDescriptionApplyStore,
  PostgresqlProductDescriptionEvidenceAssembler,
  PostgresqlProductDescriptionJobRepository,
  PostgresqlProductRepository,
  PostgresqlProductUsageConditions,
} from '@darun/products-datasource';
import {
  ApplyProductDescriptionCandidate,
  EditProduct,
  GenerateProductDescriptionCandidate,
  GetProduct,
} from '@darun/products-domain';
import { ProductDescriptionJobService, ProductDescriptionQueueService } from '@darun/products-service';
import { AuthRole, createAuthChecker, createServer } from '@darun/utils-apollo-server';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { AdminProductUsageConditionsResolver } from '../src/app/graphql/AdminProductUsageConditions.resolver';

const url = process.env['PRODUCT_USAGE_CONDITIONS_TEST_DATABASE_URL'];
const suite = url ? describe : describe.skip;
const productId = 'usage-conditions-test';
const oldBody = '<p>저장해 둔 소개</p>';
const condition = {
  statement: '관리자 계정에서만 <파일>을 내려받을 수 있습니다.',
  sourceUrl: 'https://example.com/help?plan=team&platform=ios',
  excerpt: '내부 확인용 발췌',
  checkedOn: '2026-11-28',
};
const fields = 'productId revision editorId items { statement sourceUrl excerpt checkedOn }';
const query = `{ conditions: adminProductUsageConditions(slug: "conditions-test") { ${fields} } }`;
const mutation = `mutation ($input: SaveAdminProductUsageConditionsInput!) {
  conditions: saveAdminProductUsageConditions(input: $input) { ${fields} }
}`;

suite('사용 조건의 GraphQL 및 PostgreSQL 계약', () => {
  let sql: ReturnType<typeof postgres>;
  let db: ReturnType<typeof drizzle>;
  let server: ReturnType<typeof createServer>;

  beforeAll(async () => {
    const target = new URL(url!);
    if (target.hostname !== '127.0.0.1' || target.pathname !== '/darun_product_usage_conditions') {
      throw new Error('Requires isolated local darun_product_usage_conditions database');
    }
    sql = postgres(url!, { connect_timeout: 5 });
    db = drizzle(sql);
    await migrate(db, {
      migrationsFolder: resolve(__dirname, '../scripts/migrations'),
    });
    const resolver = new AdminProductUsageConditionsResolver(new PostgresqlProductUsageConditions(db));
    server = createServer({
      options: {
        resolvers: [AdminProductUsageConditionsResolver],
        container: { get: () => resolver },
        authChecker: createAuthChecker(),
      },
      config: { playground: false },
    });
    await server.start();
  }, 30_000);

  beforeEach(async () => {
    await sql`delete from product_description_jobs`;
    await sql`delete from products`;
    await sql`insert into products (id, slug, name, summary, description, logo_url, content_revision)
      values (${productId}, 'conditions-test', '서비스', '요약', ${oldBody}, '', 3),
             ('another-product', 'another-test', '다른 서비스', '요약', ${oldBody}, '', 3)`;
  });

  afterAll(async () => {
    await server?.stop();
    await sql?.end({ timeout: 5 });
  });

  async function run(operation: string, variables: Record<string, unknown> = {}, admin = true) {
    const response = await server.executeOperation<{
      conditions: {
        productId: string;
        revision: string | null;
        editorId: string | null;
        items: (typeof condition)[];
      };
    }>(
      { query: operation, variables },
      {
        contextValue: {
          getRoles: async () => (admin ? [AuthRole.Admin] : []),
          getUserIdOrThrow: async () => 'fixture-editor',
        },
      }
    );
    if (response.body.kind !== 'single') throw new Error('Expected single GraphQL result');
    return response.body.singleResult;
  }

  function save(items = [condition], expectedRevision: string | null = null, id = productId) {
    return run(mutation, { input: { productId: id, expectedRevision, items } });
  }

  async function candidate() {
    const reader = new PostgresqlProductDescriptionEvidenceAssembler(db);
    const useCase = new GenerateProductDescriptionCandidate(reader, {
      generate: async evidence => {
        expect(JSON.stringify(evidence)).not.toContain(condition.excerpt);
        expect(JSON.stringify(evidence)).not.toContain(condition.statement);
        return {
          document: {
            intro: { text: '새 소개', evidenceRefs: ['product:summary'] },
            sections: [],
            recommendedIf: [],
            limitations: [],
            closing: { text: '', evidenceRefs: [] },
          },
          candidateHtml: '<p>새 소개</p>',
          writerModel: 'fixture',
          reviewerModel: 'fixture',
          writerPromptVersion: '1',
          reviewerPromptVersion: '1',
          rendererVersion: '1',
        };
      },
    });
    const jobs = new PostgresqlProductDescriptionJobRepository(db);
    const job = await jobs.createJob({ productId });
    const worker = new ProductDescriptionJobService(
      new GetProduct(new PostgresqlProductRepository(db)),
      useCase,
      jobs,
      new ProductDescriptionQueueService()
    );
    await worker.executeJob(job.id, productId);
    const stored = await jobs.findJobById(job.id);
    expect(stored?.status).toBe('completed');
    expect(stored?.candidateHtml).toBeTruthy();
    return { id: job.id, jobs, html: stored!.candidateHtml! };
  }

  it('관리자만 조건을 읽고 저장하며 잘못된 입력으로 공개 본문이나 원본을 변경하지 않는다', async () => {
    expect((await run(query, {}, false)).errors).toHaveLength(1);
    expect((await run(mutation, { input: { productId, items: [condition] } }, false)).errors).toHaveLength(1);
    expect((await save([{ ...condition, sourceUrl: 'javascript:void(0)' }])).errors?.[0]?.extensions?.code).toBe(
      'BAD_USER_INPUT'
    );
    expect((await save([{ ...condition, checkedOn: '2026-02-30' }])).errors?.[0]?.extensions?.code).toBe(
      'BAD_USER_INPUT'
    );
    expect((await save(Array(6).fill(condition))).errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT');
    expect((await run(query)).data?.conditions).toMatchObject({
      items: [],
      revision: null,
    });
    expect((await save([])).data?.conditions).toMatchObject({ items: [], revision: null });
    const stored = await save();
    expect(stored.errors).toBeUndefined();
    expect(stored.data?.conditions).toMatchObject({
      productId,
      editorId: 'fixture-editor',
      items: [condition],
    });
    expect((await run(query)).data).toEqual(stored.data);
    expect((await sql`select description, content_revision from products where id = ${productId}`)[0]).toEqual({
      description: oldBody,
      content_revision: '3',
    });
    expect((await save([], stored.data!.conditions.revision, 'another-product')).errors?.[0]?.extensions?.code).toBe(
      'PRODUCT_USAGE_CONDITIONS_STALE'
    );
    const edit = new EditProduct(new PostgresqlProductRepository(db));
    await edit.execute({ id: 'another-product', description: null });
    expect((await sql`select description from products where id = 'another-product'`)[0].description).toBeNull();
  });

  it('이전 후보는 조건 변경 뒤 거절하고 원본 조건은 후보 저장과 일반 본문 수정에도 보존한다', async () => {
    const first = (await save()).data!.conditions;
    const old = await candidate();
    const apply = new ApplyProductDescriptionCandidate(new PostgresqlProductDescriptionApplyStore(db));
    const nextCondition = {
      ...condition,
      statement: '팀 계정에서만 iOS 18에 지원합니다.',
    };
    const results = await Promise.all([save([nextCondition], first.revision), save([nextCondition], first.revision)]);
    expect(
      results.filter(result => result.errors?.[0]?.extensions?.code === 'PRODUCT_USAGE_CONDITIONS_STALE')
    ).toHaveLength(1);
    expect(
      results.filter(result => result.data?.conditions.items[0].statement === nextCondition.statement)
    ).toHaveLength(1);
    await expect(apply.execute({ jobId: old.id })).rejects.toMatchObject({
      code: 'STALE_CANDIDATE',
    });
    expect((await old.jobs.findJobById(old.id))?.usageConditions?.items).toEqual([condition]);
    expect((await sql`select description from products where id = ${productId}`)[0].description).toBe(oldBody);

    const current = await candidate();
    expect(current.html).toContain(nextCondition.statement);
    expect((await apply.execute({ jobId: current.id })).product.description).toBe(current.html);
    const edit = new EditProduct(new PostgresqlProductRepository(db));
    const edited = await edit.execute({
      id: productId,
      description: '<p>별도 본문 수정</p>',
    });
    expect(edited.description).toBe(current.html.replace('<p>새 소개</p>', '<p>별도 본문 수정</p>'));
    expect((await apply.execute({ jobId: current.id })).alreadyApplied).toBe(true);
    const cleared = await edit.execute({ id: productId, description: null });
    expect(cleared.description).toBe(current.html.replace('<p>새 소개</p>', ''));
  });

  it('조건을 제거해도 적용하지 않은 이전 후보가 다시 유효해지지 않는다', async () => {
    const legacy = await candidate();
    const saved = (await save()).data!.conditions;
    const withConditions = await candidate();
    expect((await save([], saved.revision)).errors).toBeUndefined();
    const apply = new ApplyProductDescriptionCandidate(new PostgresqlProductDescriptionApplyStore(db));
    for (const job of [legacy, withConditions]) {
      await expect(apply.execute({ jobId: job.id })).rejects.toMatchObject({ code: 'STALE_CANDIDATE' });
      expect((await job.jobs.findJobById(job.id))?.appliedAt).toBeNull();
    }
    expect((await sql`select description from products where id = ${productId}`)[0].description).toBe(oldBody);
  });

  it('조건 제거는 다음 생성 후보에 반영되고 기존 본문은 적용 시점에 교체된다', async () => {
    const saved = (await save()).data!.conditions;
    expect((await save([], saved.revision)).errors).toBeUndefined();
    expect((await sql`select description from products where id = ${productId}`)[0].description).toBe(oldBody);
    const withoutConditions = await candidate();
    expect(withoutConditions.html).toBe('<p>새 소개</p>');
    const apply = new ApplyProductDescriptionCandidate(new PostgresqlProductDescriptionApplyStore(db));
    expect((await apply.execute({ jobId: withoutConditions.id })).product.description).toBe(withoutConditions.html);
  });

  it('조건 저장이 먼저 Product를 잠그면 뒤따르는 적용은 새 revision을 읽고 거절한다', async () => {
    const current = (await save()).data!.conditions;
    const job = await candidate();
    const writerSql = postgres(url!, { max: 1, connection: { application_name: 'usage_condition_writer' } });
    const applySql = postgres(url!, { max: 1, connection: { application_name: 'usage_candidate_apply' } });
    const blocker = await sql.reserve();
    const writer = new PostgresqlProductUsageConditions(drizzle(writerSql));
    const apply = new ApplyProductDescriptionCandidate(new PostgresqlProductDescriptionApplyStore(drizzle(applySql)));
    let saving: Promise<unknown> | undefined;
    let applying: Promise<unknown> | undefined;
    try {
      await sql`create function fixture_pause_condition_write() returns trigger language plpgsql as $$
        begin perform pg_advisory_xact_lock(810, 1); return new; end
      $$`;
      await sql`create trigger fixture_pause_condition_write after update of usage_conditions on products
        for each row execute function fixture_pause_condition_write()`;
      await blocker`select pg_advisory_lock(810, 1)`;
      saving = writer
        .save({
          productId,
          expectedRevision: current.revision,
          editorId: 'second-editor',
          items: [{ ...condition, statement: '변경된 사용 조건' }],
        })
        .catch((error: unknown) => error);
      await expect
        .poll(
          async () =>
            (
              await sql`select exists (
        select 1 from pg_stat_activity where application_name = 'usage_condition_writer' and wait_event = 'advisory'
      ) as blocked`
            )[0].blocked
        )
        .toBe(true);

      applying = apply.execute({ jobId: job.id }).catch((error: unknown) => error);
      await expect
        .poll(
          async () =>
            (
              await sql`select exists (
        select 1 from pg_stat_activity where application_name = 'usage_candidate_apply' and wait_event_type = 'Lock'
      ) as blocked`
            )[0].blocked
        )
        .toBe(true);

      await blocker`select pg_advisory_unlock(810, 1)`;
      expect(await saving).toMatchObject({ editorId: 'second-editor' });
      expect(await applying).toMatchObject({ code: 'STALE_CANDIDATE' });
      expect((await sql`select description from products where id = ${productId}`)[0].description).toBe(oldBody);
      expect((await job.jobs.findJobById(job.id))?.appliedAt).toBeNull();
    } finally {
      await blocker`select pg_advisory_unlock_all()`;
      blocker.release();
      await Promise.allSettled([saving, applying]);
      await Promise.all([writerSql.end({ timeout: 5 }), applySql.end({ timeout: 5 })]);
      await sql`drop trigger if exists fixture_pause_condition_write on products`;
      await sql`drop function if exists fixture_pause_condition_write()`;
    }
  }, 10_000);

  it('후보 적용 실패가 미공개 문구와 URL을 진단에 노출하거나 본문과 적용 이력을 변경하지 않는다', async () => {
    expect((await save()).errors).toBeUndefined();
    const job = await candidate();
    const apply = new ApplyProductDescriptionCandidate(new PostgresqlProductDescriptionApplyStore(db));
    await sql`alter table products add constraint fixture_no_candidate check (description not like '<p>새 소개</p>%')`;
    try {
      const failure: unknown = await apply.execute({ jobId: job.id }).catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(Error);
      expect((failure as Error).message).toBe('Could not write product description');
      expect((failure as Error).cause).toBeUndefined();
      expect(JSON.stringify(failure)).not.toContain(condition.sourceUrl);
      expect((await sql`select description from products where id = ${productId}`)[0].description).toBe(oldBody);
      expect((await job.jobs.findJobById(job.id))?.appliedAt).toBeNull();
    } finally {
      await sql`alter table products drop constraint fixture_no_candidate`;
    }
  });

  it('미공개 상품의 일반 수정 실패도 적용된 조건을 진단에 노출하지 않는다', async () => {
    expect((await save()).errors).toBeUndefined();
    const job = await candidate();
    const apply = new ApplyProductDescriptionCandidate(new PostgresqlProductDescriptionApplyStore(db));
    await apply.execute({ jobId: job.id });
    const edit = new EditProduct(new PostgresqlProductRepository(db));
    await sql`alter table products add constraint fixture_no_name check (name <> '저장 실패')`;
    try {
      const failure: unknown = await edit
        .execute({ id: productId, name: '저장 실패' })
        .catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(Error);
      expect((failure as Error).message).toBe('Could not update product content');
      expect((failure as Error).cause).toBeUndefined();
      expect(JSON.stringify(failure)).not.toContain(condition.sourceUrl);
      expect((await sql`select description, name from products where id = ${productId}`)[0]).toEqual({
        name: '서비스',
        description: job.html,
      });
    } finally {
      await sql`alter table products drop constraint fixture_no_name`;
    }
  });
});
