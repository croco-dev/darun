import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { productDescriptionJobs } from '../entities/ProductDescriptionJobSchema';
import { productResearchJobs } from '../entities/ProductResearchJobSchema';
import { PostgresqlProductDescriptionJobRepository } from '../repositories/PostgresqlProductDescriptionJobRepository';
import { PostgresqlProductResearchJobRepository } from '../repositories/PostgresqlProductResearchJobRepository';

const DATABASE_URL = process.env['W4_DATABASE_URL'] ?? 'postgresql://darun:darun@localhost:55433/darun';

const maybeDescribe = process.env['W4_PG'] === '1' ? describe : describe.skip;

function unique(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`;
}

maybeDescribe('W4 job lease recovery (isolated PG)', () => {
  let sql: ReturnType<typeof postgres>;
  let db: ReturnType<typeof drizzle>;
  let createdIds: { descJobs: string[]; researchJobs: string[] };

  beforeAll(async () => {
    sql = postgres(DATABASE_URL, { prepare: false, max: 10 });
    db = drizzle(sql);
    createdIds = { descJobs: [], researchJobs: [] };
    await db.execute('select 1');
  });

  afterAll(async () => {
    for (const id of createdIds.descJobs) {
      await db
        .delete(productDescriptionJobs)
        .where(eq(productDescriptionJobs.id, id))
        .catch(() => {});
    }
    for (const id of createdIds.researchJobs) {
      await db
        .delete(productResearchJobs)
        .where(eq(productResearchJobs.id, id))
        .catch(() => {});
    }
    await sql?.end({ timeout: 5 });
  });

  it('W4-A1: late older-attempt writes are rejected by the DB lease condition', async () => {
    const repo = new PostgresqlProductDescriptionJobRepository(db as never);
    const rows = await db
      .insert(productDescriptionJobs)
      .values({ productId: unique('prod'), status: 'pending', message: 'pending' })
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
    const done = await repo.completeJobLease(job.id, leaseA, 'completed', { message: 'done' });
    expect(done?.status).toBe('completed');
  });

  it('W4-A2: expired-lease in_progress and enqueue-missed pending are rediscovered', async () => {
    const repo = new PostgresqlProductResearchJobRepository(db as never);
    const now = new Date();
    const pendingRows = await db
      .insert(productResearchJobs)
      .values({ requestKey: unique('rk'), officialUrl: 'https://example.com/', status: 'pending' })
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
