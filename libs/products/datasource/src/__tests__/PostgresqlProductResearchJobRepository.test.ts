import 'reflect-metadata';
import { eq } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { productResearchJobs } from '../entities/ProductResearchJobSchema';
import { PostgresqlProductResearchJobRepository } from '../repositories/PostgresqlProductResearchJobRepository';

const DATABASE_URL = process.env['W4_DATABASE_URL'] ?? 'postgresql://darun:darun@localhost:55433/darun';

const maybeDescribe = process.env['W4_PG'] === '1' ? describe : describe.skip;

function unique(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`;
}

maybeDescribe('research job claim attempt cap (isolated PG)', () => {
  let sql: Sql;
  let db: PostgresJsDatabase;
  let repo: PostgresqlProductResearchJobRepository;
  const createdIds: string[] = [];
  beforeAll(async () => {
    sql = postgres(DATABASE_URL, { prepare: false, max: 10 });
    db = drizzle(sql);
    repo = new PostgresqlProductResearchJobRepository(db as never);
    await db.execute('select 1');
  });

  afterAll(async () => {
    for (const id of createdIds) {
      await db
        .delete(productResearchJobs)
        .where(eq(productResearchJobs.id, id))
        .catch(() => {});
    }
    await sql?.end({ timeout: 5 });
  });

  it('소진된 pending job은 reclaim 없이 failed로 수렴한다', async () => {
    const rows = await db
      .insert(productResearchJobs)
      .values({ requestKey: unique('rk'), officialUrl: 'https://example.com/', status: 'pending', attemptCount: 3 })
      .returning();
    const job = rows[0]!;
    createdIds.push(job.id);

    const result = await repo.claimJob({
      jobId: job.id,
      leaseToken: 'lease-new',
      leaseUntil: new Date(Date.now() + 60_000),
    });

    expect(result.claimed).toBe(false);
    expect(result.job?.status).toBe('failed');
    expect(result.job?.errorCode).toBe('RETRY_EXHAUSTED');

    const reread = await db.select().from(productResearchJobs).where(eq(productResearchJobs.id, job.id));
    expect(reread[0]!.status).toBe('failed');
    expect(reread[0]!.leaseToken).toBeNull();
    expect(reread[0]!.attemptCount).toBe(3);
  });

  it('만료 lease 소진 job도 재claim 없이 failed로 수렴한다', async () => {
    const rows = await db
      .insert(productResearchJobs)
      .values({
        requestKey: unique('rk'),
        officialUrl: 'https://example.com/',
        status: 'in_progress',
        leaseToken: 'lease-old',
        leaseUntil: new Date(Date.now() - 60_000),
        attemptCount: 3,
      })
      .returning();
    const job = rows[0]!;
    createdIds.push(job.id);

    const result = await repo.claimJob({
      jobId: job.id,
      leaseToken: 'lease-new',
      leaseUntil: new Date(Date.now() + 60_000),
    });

    expect(result.claimed).toBe(false);
    expect(result.job?.status).toBe('failed');

    const reread = await db.select().from(productResearchJobs).where(eq(productResearchJobs.id, job.id));
    expect(reread[0]!.status).toBe('failed');
    expect(reread[0]!.leaseToken).toBeNull();
  });

  it('유효 lease의 in_progress job은 다른 token의 claim을 거부한다', async () => {
    const rows = await db
      .insert(productResearchJobs)
      .values({
        requestKey: unique('rk'),
        officialUrl: 'https://example.com/',
        status: 'in_progress',
        leaseToken: 'lease-live',
        leaseUntil: new Date(Date.now() + 60_000),
        attemptCount: 1,
      })
      .returning();
    const job = rows[0]!;
    createdIds.push(job.id);

    const other = await repo.claimJob({
      jobId: job.id,
      leaseToken: 'lease-new',
      leaseUntil: new Date(Date.now() + 60_000),
    });

    expect(other.claimed).toBe(false);
    expect(other.job?.status).toBe('in_progress');

    const reread = await db.select().from(productResearchJobs).where(eq(productResearchJobs.id, job.id));
    expect(reread[0]!.leaseToken).toBe('lease-live');
    expect(reread[0]!.attemptCount).toBe(1);
  });
});
