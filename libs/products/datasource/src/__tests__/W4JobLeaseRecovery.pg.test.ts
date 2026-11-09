import 'reflect-metadata';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { productDescriptionJobs } from '../entities/ProductDescriptionJobSchema';
import { productResearchJobs } from '../entities/ProductResearchJobSchema';
import { PostgresqlProductDescriptionJobRepository } from '../repositories/PostgresqlProductDescriptionJobRepository';
import { PostgresqlProductResearchJobRepository } from '../repositories/PostgresqlProductResearchJobRepository';

const databaseUrl = process.env['W4_DATABASE_URL'];

const maybeDescribe = process.env['W4_PG'] === '1' ? describe : describe.skip;

function unique(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`;
}

maybeDescribe('W4 job lease recovery (isolated PG)', () => {
  let sql: ReturnType<typeof postgres>;
  let db: ReturnType<typeof drizzle>;
  let createdIds: { descJobs: string[]; researchJobs: string[] };

  beforeAll(async () => {
    if (!databaseUrl) throw new Error('W4_DATABASE_URL is required when W4_PG=1');
    const target = new URL(databaseUrl);
    if (
      !['postgres:', 'postgresql:'].includes(target.protocol) ||
      !['localhost', '127.0.0.1'].includes(target.hostname) ||
      target.pathname !== '/darun_lease_integrity' ||
      target.search ||
      target.hash
    ) {
      throw new Error('Requires the isolated local darun_lease_integrity database');
    }
    sql = postgres(databaseUrl, {
      prepare: false,
      max: 10,
      connect_timeout: 5,
    });
    db = drizzle(sql);
    createdIds = { descJobs: [], researchJobs: [] };
    await migrate(db, {
      migrationsFolder: resolve(__dirname, '../../../../../apps/graphql-api/scripts/migrations'),
    });
  }, 30_000);

  afterAll(async () => {
    for (const id of createdIds?.descJobs ?? []) {
      await db
        .delete(productDescriptionJobs)
        .where(eq(productDescriptionJobs.id, id))
        .catch(() => {});
    }
    for (const id of createdIds?.researchJobs ?? []) {
      await db
        .delete(productResearchJobs)
        .where(eq(productResearchJobs.id, id))
        .catch(() => {});
    }
    await sql?.end({ timeout: 5 });
  });

  it('같은 시각의 소개 작업 251건을 ID 내림차순으로 100건씩 빠짐없이 읽는다', async () => {
    const prefix = unique('page-order');
    const ids = Array.from({ length: 251 }, (_, index) => `${prefix}-${String(index).padStart(3, '0')}`);
    try {
      await db.insert(productDescriptionJobs).values(
        ids.map(id => ({
          id,
          productId: 'page-fixture',
          status: 'failed',
          createdAt: new Date('2099-01-01T00:00:00Z'),
        }))
      );
      const repository = new PostgresqlProductDescriptionJobRepository(db as never);
      const expected = [...ids].reverse();
      for (const status of [undefined, 'failed'] as const) {
        const pages = [];
        for (const offset of [0, 100, 200]) {
          const page = await repository.findJobs({ status, limit: 100, offset });
          pages.push(...page.filter(job => job.id.startsWith(prefix)));
          expect(page.slice(0, Math.min(100, 251 - offset)).map(job => job.id)).toEqual(
            expected.slice(offset, offset + 100)
          );
        }
        expect(pages.map(job => job.id)).toEqual(expected);
        expect(new Set(pages.map(job => job.id)).size).toBe(251);
        expect(
          (await repository.findJobs({ status, limit: 100, offset: 251 })).some(job => job.id.startsWith(prefix))
        ).toBe(false);
        expect((await repository.findJobs({ status, limit: 300 })).map(job => job.id)).toEqual(expected.slice(0, 100));
      }
    } finally {
      await db.delete(productDescriptionJobs).where(inArray(productDescriptionJobs.id, ids));
    }
  });

  it('concurrent generation and failed-retry request keys create one runnable job across connections', async () => {
    const second = postgres(databaseUrl!, {
      max: 1,
      prepare: false,
      connect_timeout: 5,
    });
    const repositories = [
      new PostgresqlProductDescriptionJobRepository(db as never),
      new PostgresqlProductDescriptionJobRepository(drizzle(second) as never),
    ];
    try {
      for (const retryOfJobId of [undefined, unique('failed-parent')]) {
        const requestKey = randomUUID();
        const input = {
          productId: unique('product'),
          requestKey,
          retryOfJobId,
        };
        const results = await Promise.all(repositories.map(repo => repo.createJob(input)));
        const id = results[0]!.id;
        createdIds.descJobs.push(id);
        expect(results.map(job => job.id)).toEqual([id, id]);
        expect(
          await db.select().from(productDescriptionJobs).where(eq(productDescriptionJobs.requestKey, requestKey))
        ).toHaveLength(1);
        const claims = await Promise.all(
          repositories.map((repo, index) =>
            repo.claimJobLease({
              jobId: id,
              leaseToken: `lease-${index}`,
              leaseUntil: new Date(Date.now() + 60_000),
            })
          )
        );
        expect(claims.filter(Boolean)).toHaveLength(1);
        const claimed = claims.find(Boolean)!;
        await repositories[0]!.completeJobLease(id, claimed.leaseToken!, 'completed', {
          candidateHtml: '<p>saved</p>',
        });
        expect(await repositories[1]!.createJob(input)).toMatchObject({
          id,
          status: 'completed',
          candidateHtml: '<p>saved</p>',
        });
        await expect(repositories[1]!.createJob({ ...input, productId: unique('other') })).rejects.toMatchObject({
          code: 'IDEMPOTENCY_KEY_CONFLICT',
        });
        await expect(
          repositories[1]!.createJob({
            ...input,
            retryOfJobId: unique('other-parent'),
          })
        ).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_CONFLICT' });
      }
      // Legacy rows without request IDs remain separate and need no backfill.
      const legacy = await Promise.all(repositories.map(repo => repo.createJob({ productId: 'legacy' })));
      createdIds.descJobs.push(...legacy.map(job => job.id));
      expect(legacy[0]!.id).not.toBe(legacy[1]!.id);
    } finally {
      await second.end({ timeout: 5 });
    }
  });

  it('W4-A1: late older-attempt writes are rejected by the DB lease condition', async () => {
    const repo = new PostgresqlProductDescriptionJobRepository(db as never);
    const rows = await db
      .insert(productDescriptionJobs)
      .values({
        productId: unique('prod'),
        status: 'pending',
        message: 'pending',
      })
      .returning();
    const job = rows[0]!;
    createdIds.descJobs.push(job.id);

    const leaseA = `lease-a-${unique('t')}`;
    const claimedA = await repo.claimJobLease({
      jobId: job.id,
      leaseToken: leaseA,
      leaseUntil: new Date(Date.now() + 60_000),
    });
    expect(claimedA?.leaseToken).toBe(leaseA);

    // 두 번째 커넥션의 늦은 확정 시도는 구 lease로 거부된다.
    const late = await repo.completeJobLease(job.id, `lease-stale-${unique('t')}`, 'completed', {
      message: 'late',
    });
    expect(late).toBeNull();

    // 소유 lease의 확정은 통과한다.
    const done = await repo.completeJobLease(job.id, leaseA, 'completed', {
      message: 'done',
    });
    expect(done?.status).toBe('completed');
  });

  it('W4-A2: expired-lease in_progress and enqueue-missed pending are rediscovered', async () => {
    const repo = new PostgresqlProductResearchJobRepository(db as never);
    const now = new Date();
    const pendingRows = await db
      .insert(productResearchJobs)
      .values({
        requestKey: unique('rk'),
        officialUrl: 'https://example.com/',
        status: 'pending',
      })
      .returning();
    const expiredRows = await db
      .insert(productResearchJobs)
      .values({
        requestKey: unique('rk'),
        officialUrl: 'https://example.com/',
        status: 'in_progress',
        leaseToken: `lease-old-${unique('t')}`,
        leaseUntil: new Date(now.getTime() - 60_000),
      })
      .returning();
    createdIds.researchJobs.push(pendingRows[0]!.id, expiredRows[0]!.id);

    const recoverable = await repo.findRecoverableJobs({ now, limit: 50 });
    const ids = new Set(recoverable.map(job => job.id));
    expect(ids.has(pendingRows[0]!.id)).toBe(true);
    expect(ids.has(expiredRows[0]!.id)).toBe(true);

    // 복구 순서가 updatedAt 오름차순으로 안정적이다(리포지토리 ORDER BY).
    const times = recoverable.map(job => job.updatedAt.getTime());
    const sorted = [...times].sort((a, b) => a - b);
    expect(times).toEqual(sorted);
  });
});
