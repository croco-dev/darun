import { Drizzle, DrizzleToken } from '@darun/provider-database';
import {
  type TranslationJobEntity,
  type TranslationJobRepository,
  TranslationJobRepositoryToken,
  type TranslationJobStatus,
  translationFields,
  translationJobListArgs,
} from '@darun/translation-domain';
import { JOB_DISPATCH_RESERVATION_MS, JOB_MAX_ATTEMPTS, jobDispatchStatus, jobRetryDelay } from '@darun/utils-llm';
import { and, asc, desc, eq, gt, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { translationJobs } from '../entities/TranslationJobSchema';

type TranslationJobStatusOptions = {
  message?: string | null;
  error?: string | null;
  sourceHash?: string | null;
  model?: string | null;
  promptVersion?: string | null;
};

type JobDbTx = Parameters<Parameters<Drizzle['transaction']>[0]>[0];

@Service(TranslationJobRepositoryToken)
export class PostgresqlTranslationJobRepository implements TranslationJobRepository {
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

  /** Lease scheduling compares against the database clock, not the worker clock. */
  private async dbNow(tx: JobDbTx): Promise<Date> {
    const rows = (await tx.execute(sql`select clock_timestamp() as "now"`)) as { now: Date | string }[];
    const raw = rows[0]?.now;
    return raw instanceof Date ? raw : new Date(raw!);
  }

  async createJob(job: {
    entityType: string;
    entityId: string;
    locale?: string;
    fields: string[];
    retryOfJobId?: string;
    idempotencyKey?: string;
    status?: 'pending';
    message?: string;
    sourceHash?: string | null;
    model?: string | null;
    promptVersion?: string | null;
  }): Promise<TranslationJobEntity> {
    if (
      !['Product', 'Magazine', 'ProductFeature'].includes(job.entityType) ||
      !Array.isArray(job.fields) ||
      (job.status && job.status !== 'pending')
    ) {
      throw new Error('New translation jobs require an explicit entity and fields in pending state');
    }
    const fields = translationFields({
      entityType: job.entityType as 'Product' | 'Magazine' | 'ProductFeature',
      entityId: job.entityId,
      fields: job.fields,
    });
    const rows = await this.db
      .insert(translationJobs)
      .values({
        entityType: job.entityType,
        entityId: job.entityId,
        locale: job.locale ?? 'en',
        fields,
        retryOfJobId: job.retryOfJobId,
        idempotencyKey: job.idempotencyKey,
        status: job.status ?? 'pending',
        message: job.message ?? '번역 작업이 대기 중입니다.',
        sourceHash: job.sourceHash ?? null,
        model: job.model ?? null,
        promptVersion: job.promptVersion ?? null,
      })
      .returning();

    const row = rows[0];
    if (!row) {
      throw new Error('TranslationJob creation failed');
    }

    return this.toEntity(row);
  }

  private toEntity(row: {
    id: string;
    entityType: string;
    entityId: string;
    locale: string;
    fields: string[] | null;
    status: string;
    message: string | null;
    error: string | null;
    sourceHash: string | null;
    model: string | null;
    promptVersion: string | null;
    leaseToken: string | null;
    leaseUntil: Date | null;
    attemptCount: number;
    runNotBefore: Date;
    nextDispatchAt: Date;
    retryOfJobId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): TranslationJobEntity {
    return {
      id: row.id,
      entityType: row.entityType,
      entityId: row.entityId,
      locale: row.locale,
      fields: row.fields,
      status: row.status as TranslationJobStatus,
      message: row.message,
      error: row.error,
      sourceHash: row.sourceHash,
      model: row.model,
      promptVersion: row.promptVersion,
      leaseToken: row.leaseToken,
      leaseUntil: row.leaseUntil,
      attemptCount: row.attemptCount,
      runNotBefore: row.runNotBefore,
      nextDispatchAt: row.nextDispatchAt,
      retryOfJobId: row.retryOfJobId,
      dispatchStatus: jobDispatchStatus(row),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findJobById(id: string): Promise<TranslationJobEntity | null> {
    try {
      const rows = await this.db.select().from(translationJobs).where(eq(translationJobs.id, id)).limit(1);
      const row = rows[0];
      if (!row) {
        return null;
      }

      return this.toEntity(row);
    } catch (error) {
      console.warn('[PostgresqlTranslationJobRepository] Failed to find job (table may not exist yet):', error);
      return null;
    }
  }

  async claimJobLease(input: {
    jobId: string;
    leaseToken: string;
    leaseUntil: Date;
  }): Promise<TranslationJobEntity | null> {
    return this.db.transaction(async tx => {
      const [row] = await tx.select().from(translationJobs).where(eq(translationJobs.id, input.jobId)).for('update');
      const now = await this.dbNow(tx);
      if (
        !row ||
        (row.status !== 'pending' && row.status !== 'in_progress') ||
        (row.status === 'pending' && row.runNotBefore > now) ||
        (row.status === 'in_progress' && row.leaseUntil && row.leaseUntil > now)
      )
        return null;
      if (row.attemptCount >= JOB_MAX_ATTEMPTS) {
        await tx
          .update(translationJobs)
          .set({ status: 'failed', error: 'RETRY_EXHAUSTED', leaseToken: null, leaseUntil: null, updatedAt: now })
          .where(eq(translationJobs.id, row.id));
        return null;
      }
      const [claimed] = await tx
        .update(translationJobs)
        .set({
          status: 'in_progress',
          message: 'LLM으로 영문 번역을 생성하고 있습니다...',
          leaseToken: input.leaseToken,
          leaseUntil: input.leaseUntil,
          attemptCount: row.attemptCount + 1,
          updatedAt: now,
        })
        .where(eq(translationJobs.id, row.id))
        .returning();
      return claimed ? this.toEntity(claimed) : null;
    });
  }

  async completeJobLease(
    jobId: string,
    leaseToken: string,
    nextStatus: 'failed',
    options?: TranslationJobStatusOptions
  ): Promise<TranslationJobEntity | null> {
    if (nextStatus !== 'failed') throw new Error('Translation completion requires the atomic source store');
    const updateValues: Record<string, unknown> = {
      status: nextStatus,
      updatedAt: new Date(),
    };
    if (options?.message !== undefined) {
      updateValues.message = options.message;
    }
    if (options?.error !== undefined) {
      updateValues.error = options.error;
    }
    if (options?.sourceHash !== undefined) {
      updateValues.sourceHash = options.sourceHash;
    }
    if (options?.model !== undefined) {
      updateValues.model = options.model;
    }
    if (options?.promptVersion !== undefined) {
      updateValues.promptVersion = options.promptVersion;
    }
    // 상태 가드 완성: lease 소유권과 함께 in_progress에서만 확정한다.
    // 이미 superseded/completed/failed로 끝난 행은 늦은 completed로 덮어쓰지 않는다.
    const rows = await this.db
      .update(translationJobs)
      .set(updateValues)
      .where(
        and(
          eq(translationJobs.id, jobId),
          eq(translationJobs.leaseToken, leaseToken),
          eq(translationJobs.status, 'in_progress'),
          gt(translationJobs.leaseUntil, new Date())
        )
      )
      .returning();
    const row = rows[0];
    return row ? this.toEntity(row) : null;
  }

  async findActiveJob(input: {
    entityType: string;
    entityId: string;
    locale?: string;
  }): Promise<TranslationJobEntity | null> {
    const rows = await this.db
      .select()
      .from(translationJobs)
      .where(
        and(
          eq(translationJobs.entityType, input.entityType),
          eq(translationJobs.entityId, input.entityId),
          eq(translationJobs.locale, input.locale ?? 'en'),
          inArray(translationJobs.status, ['pending', 'in_progress'] as const)
        )
      )
      .orderBy(desc(translationJobs.createdAt))
      .limit(1);
    const row = rows[0];
    return row ? this.toEntity(row) : null;
  }

  async retryJobLease(jobId: string, leaseToken: string, error: string): Promise<TranslationJobEntity | null> {
    return this.db.transaction(async tx => {
      const [row] = await tx
        .select()
        .from(translationJobs)
        .where(
          and(
            eq(translationJobs.id, jobId),
            eq(translationJobs.leaseToken, leaseToken),
            eq(translationJobs.status, 'in_progress')
          )
        )
        .for('update');
      const now = await this.dbNow(tx);
      if (!row || !row.leaseUntil || row.leaseUntil <= now) return null;
      const retryAt = new Date(now.getTime() + jobRetryDelay(row.attemptCount));
      const [updated] = await tx
        .update(translationJobs)
        .set({
          status: row.attemptCount >= JOB_MAX_ATTEMPTS ? 'failed' : 'pending',
          error,
          message: '번역 작업을 재시도합니다.',
          leaseToken: null,
          leaseUntil: null,
          runNotBefore: retryAt,
          nextDispatchAt: retryAt,
          updatedAt: now,
        })
        .where(eq(translationJobs.id, row.id))
        .returning();
      return updated ? this.toEntity(updated) : null;
    });
  }

  async findRecoverableJobs(input: { now: Date; limit?: number }): Promise<TranslationJobEntity[]> {
    return this.db.transaction(async tx => {
      const now = await this.dbNow(tx);
      const rows = await tx
        .select()
        .from(translationJobs)
        .where(
          and(
            lte(translationJobs.nextDispatchAt, now),
            or(
              and(eq(translationJobs.status, 'pending'), lte(translationJobs.runNotBefore, now)),
              and(
                eq(translationJobs.status, 'in_progress'),
                or(isNull(translationJobs.leaseUntil), lte(translationJobs.leaseUntil, now))
              )
            )
          )
        )
        .orderBy(asc(translationJobs.updatedAt), asc(translationJobs.id))
        .limit(Math.min(Math.max(input.limit ?? 25, 1), 25))
        .for('update', { skipLocked: true });
      const reserved: TranslationJobEntity[] = [];
      for (const row of rows) {
        if (row.attemptCount >= JOB_MAX_ATTEMPTS) {
          await tx
            .update(translationJobs)
            .set({ status: 'failed', error: 'RETRY_EXHAUSTED', leaseToken: null, leaseUntil: null, updatedAt: now })
            .where(eq(translationJobs.id, row.id));
          continue;
        }
        const [next] = await tx
          .update(translationJobs)
          .set({ nextDispatchAt: new Date(now.getTime() + JOB_DISPATCH_RESERVATION_MS) })
          .where(eq(translationJobs.id, row.id))
          .returning();
        if (next) reserved.push(this.toEntity(next));
      }
      return reserved;
    });
  }

  async findJobs(options?: {
    status?: TranslationJobStatus;
    limit?: number;
    offset?: number;
  }): Promise<TranslationJobEntity[]> {
    const { status, limit, offset } = translationJobListArgs(options);
    try {
      let query = this.db.select().from(translationJobs);
      if (status) {
        query = query.where(eq(translationJobs.status, status)) as typeof query;
      }

      const rows = await query.orderBy(desc(translationJobs.createdAt)).limit(limit).offset(offset);

      return rows.map(row => this.toEntity(row));
    } catch (error) {
      console.warn('[PostgresqlTranslationJobRepository] Failed to find jobs:', error);
      return [];
    }
  }
}
