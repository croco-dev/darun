import { and, eq, inArray, sql as query } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { productDescriptionJobs } from '../entities/ProductDescriptionJobSchema';
import { productResearchJobs } from '../entities/ProductResearchJobSchema';
import { PostgresqlProductDescriptionJobRepository } from '../repositories/PostgresqlProductDescriptionJobRepository';
import { PostgresqlProductResearchJobRepository } from '../repositories/PostgresqlProductResearchJobRepository';
import { translationJobs } from '../../../../translation/datasource/src/entities/TranslationJobSchema';
import { translations } from '../../../../translation/datasource/src/entities/TranslationSchema';
import { PostgresqlTranslationJobRepository } from '../../../../translation/datasource/src/repositories/PostgresqlTranslationJobRepository';
import { ProductDescriptionJobService } from '../../../service/src/ProductDescriptionJobService';

const DATABASE_URL = process.env['W4_DATABASE_URL'] ?? 'postgresql://darun:darun@localhost:55433/darun';

const maybeDescribe = process.env['W4_PG'] === '1' ? describe : describe.skip;

function unique(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`;
}

maybeDescribe('W4 job lease recovery (isolated PG)', () => {
  let sql: ReturnType<typeof postgres>;
  let db: ReturnType<typeof drizzle>;
  let createdIds: { descJobs: string[]; researchJobs: string[] };
  const translationEntities: string[] = [];

  beforeAll(async () => {
    sql = postgres(DATABASE_URL, { prepare: false, max: 10 });
    db = drizzle(sql);
    createdIds = { descJobs: [], researchJobs: [] };
    await db.execute('select 1');
  });

  afterAll(async () => {
    for (const entityId of translationEntities) {
      await db.delete(translations).where(eq(translations.entityId, entityId));
      await db.delete(translationJobs).where(eq(translationJobs.entityId, entityId));
    }
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

  it('B06: parallel requests for one entity reuse exactly one active intent', async () => {
    const entityId = unique('translation-concurrent');
    translationEntities.push(entityId);
    const repo = new PostgresqlTranslationJobRepository(db as never);
    const jobs = await Promise.all(
      Array.from({ length: 12 }, () => repo.createJob({ entityType: 'Product', entityId, locale: 'en' }))
    );
    expect(new Set(jobs.map(job => job.id)).size).toBe(1);
    const active = await db
      .select()
      .from(translationJobs)
      .where(
        and(
          eq(translationJobs.entityType, 'Product'),
          eq(translationJobs.entityId, entityId),
          eq(translationJobs.locale, 'en'),
          inArray(translationJobs.status, ['pending', 'in_progress'])
        )
      );
    expect(active.map(job => job.id)).toEqual([jobs[0]!.id]);
  });

  it('B05: a reclaimed and completed owner fences the old writer and preserves its translations', async () => {
    const entityId = unique('translation-reclaimed');
    translationEntities.push(entityId);
    const repo = new PostgresqlTranslationJobRepository(db as never);
    const job = await repo.createJob({ entityType: 'Product', entityId });
    expect(
      await repo.claimJobLease({
        jobId: job.id,
        leaseToken: 'A',
        leaseUntil: new Date(Date.now() + 60_000),
      })
    ).not.toBeNull();
    await db
      .update(translationJobs)
      .set({ leaseUntil: new Date(Date.now() - 1000) })
      .where(eq(translationJobs.id, job.id));
    expect(
      await repo.claimJobLease({
        jobId: job.id,
        leaseToken: 'B',
        leaseUntil: new Date(Date.now() + 60_000),
      })
    ).not.toBeNull();
    const row = { entityType: 'Product', entityId, locale: 'en', field: 'name', value: 'B translation' };
    expect(await repo.commitTranslations(job.id, 'B', [row])).toBe(true);
    expect(await repo.completeJobLease(job.id, 'B', 'completed')).not.toBeNull();
    expect(
      await repo.commitTranslations(job.id, 'A', [
        { ...row, value: 'late A overwrite' },
        { ...row, field: 'summary', value: 'late A insert' },
      ])
    ).toBe(false);
    const persisted = await db.select().from(translations).where(eq(translations.entityId, entityId));
    expect(persisted.map(({ field, value }) => ({ field, value }))).toEqual([
      { field: 'name', value: 'B translation' },
    ]);
  });

  it('B05: expiry during a real row-lock wait rejects the translation after acquiring the lock', async () => {
    const entityId = unique('translation-lock-expiry');
    translationEntities.push(entityId);
    const repo = new PostgresqlTranslationJobRepository(db as never);
    const job = await repo.createJob({ entityType: 'Product', entityId });
    const leaseUntil = new Date(Date.now() + 1000);
    await repo.claimJobLease({ jobId: job.id, leaseToken: 'A', leaseUntil });
    const applicationName = unique('fenced-writer');
    const writer = postgres(DATABASE_URL, {
      prepare: false,
      max: 1,
      connection: { application_name: applicationName },
    });
    let commit: Promise<boolean> | undefined;
    try {
      await db.transaction(async locker => {
        await locker.execute(query`select id from translation_jobs where id = ${job.id} for update`);
        const workerRepo = new PostgresqlTranslationJobRepository(drizzle(writer) as never);
        commit = workerRepo.commitTranslations(job.id, 'A', [
          {
            entityType: 'Product',
            entityId,
            locale: 'en',
            field: 'name',
            value: 'expired',
          },
        ]);
        // Observe PostgreSQL's actual blocking state, not a guessed scheduling delay.
        const deadline = Date.now() + 5000;
        let waiting = false;
        while (Date.now() < deadline) {
          const activity = await sql`select 1 from pg_stat_activity
            where application_name = ${applicationName} and wait_event_type = 'Lock'`;
          if (activity.length > 0) {
            waiting = true;
            break;
          }
          await sql`select pg_sleep(0.01)`;
        }
        expect(waiting).toBe(true);
        await locker.execute(query`select pg_sleep(greatest(
          extract(epoch from (${leaseUntil.toISOString()}::timestamptz - clock_timestamp())), 0
        ) + 0.05)`);
      });
      expect(await commit).toBe(false);
      expect(await db.select().from(translations).where(eq(translations.entityId, entityId))).toEqual([]);
    } finally {
      await commit?.catch(() => {});
      await writer.end({ timeout: 5 });
    }
  });

  it('B07: exhausted description retry cannot transition to an acknowledged pending job', async () => {
    const repo = new PostgresqlProductDescriptionJobRepository(db as never);
    const job = await repo.createJob({ productId: unique('description-exhausted') });
    createdIds.descJobs.push(job.id);
    await db
      .update(productDescriptionJobs)
      .set({ status: 'failed', attemptCount: 5 })
      .where(eq(productDescriptionJobs.id, job.id));
    const sendJob = vi.fn();
    const service = new ProductDescriptionJobService(undefined as never, undefined as never, repo, {
      sendJob,
    } as never);
    await expect(service.retryProductDescriptionJob(job.id)).rejects.toThrow('최대 시도 횟수');
    expect(sendJob).not.toHaveBeenCalled();
    const retries = await Promise.all(
      Array.from({ length: 4 }, () => repo.claimJobStatus(job.id, ['failed'], 'pending', { error: null }))
    );
    expect(retries).toEqual([null, null, null, null]);
    expect(
      await repo.claimJobLease({
        jobId: job.id,
        leaseToken: 'sixth',
        leaseUntil: new Date(Date.now() + 60_000),
      })
    ).toBeNull();
    const [persisted] = await db.select().from(productDescriptionJobs).where(eq(productDescriptionJobs.id, job.id));
    expect(persisted).toMatchObject({ status: 'failed', attemptCount: 5 });
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
