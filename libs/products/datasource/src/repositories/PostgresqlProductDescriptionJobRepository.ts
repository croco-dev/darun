import {
  type ProductDescriptionJobEntity,
  type ProductDescriptionJobSummary,
  type ProductDescriptionJobRepository,
  ProductDescriptionJobRepositoryToken,
  type ProductDescriptionJobStatus,
  type UpdateProductDescriptionJobOptions,
} from '@darun/products-domain';
import { databaseReadFailed, Drizzle, DrizzleToken } from '@darun/provider-database';
import {
  JOB_COMMIT_MARGIN_MS,
  JOB_DISPATCH_RESERVATION_MS,
  JOB_MAX_ATTEMPTS,
  jobDispatchStatus,
  jobRetryDelay,
} from '@darun/utils-llm';
import DataLoader from 'dataloader';
import { and, asc, desc, eq, gt, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { type ProductDescriptionJobRow, productDescriptionJobs } from '../entities/ProductDescriptionJobSchema';

type JobDbTx = Parameters<Parameters<Drizzle['transaction']>[0]>[0];

@Service(ProductDescriptionJobRepositoryToken)
export class PostgresqlProductDescriptionJobRepository implements ProductDescriptionJobRepository {
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

  private readonly candidateHtmlLoader = new DataLoader<string, string | null>(
    async ids => {
      try {
        const rows = await this.db
          .select({ id: productDescriptionJobs.id, candidateHtml: productDescriptionJobs.candidateHtml })
          .from(productDescriptionJobs)
          .where(inArray(productDescriptionJobs.id, [...ids]));
        const byId = new Map(rows.map(row => [row.id, row.candidateHtml]));
        return ids.map(id => byId.get(id) ?? null);
      } catch (error) {
        throw databaseReadFailed(error);
      }
    },
    { cache: false, maxBatchSize: 100 }
  );

  async findCandidateHtmlByJobId(id: string): Promise<string | null> {
    return this.candidateHtmlLoader.load(id);
  }

  private toEntity(row: ProductDescriptionJobRow): ProductDescriptionJobEntity {
    return {
      ...this.toSummary(row),
      candidateDocument: row.candidateDocument,
      candidateHtml: row.candidateHtml,
    };
  }

  private toSummary(
    row: Omit<ProductDescriptionJobRow, 'candidateDocument' | 'candidateHtml'>
  ): ProductDescriptionJobSummary {
    return {
      id: row.id,
      productId: row.productId,
      status: row.status as ProductDescriptionJobStatus,
      message: row.message,
      error: row.error,
      evidenceHash: row.evidenceHash,
      evidenceHashVersion: row.evidenceHashVersion,
      baseDescriptionHash: row.baseDescriptionHash,
      writerModel: row.writerModel,
      reviewerModel: row.reviewerModel,
      writerPromptVersion: row.writerPromptVersion,
      reviewerPromptVersion: row.reviewerPromptVersion,
      rendererVersion: row.rendererVersion,
      leaseToken: row.leaseToken,
      leaseUntil: row.leaseUntil,
      attemptCount: row.attemptCount,
      runNotBefore: row.runNotBefore,
      nextDispatchAt: row.nextDispatchAt,
      retryOfJobId: row.retryOfJobId,
      dispatchStatus: jobDispatchStatus(row),
      appliedAt: row.appliedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async createJob(job: {
    productId: string;
    retryOfJobId?: string;
    status?: ProductDescriptionJobStatus;
    message?: string;
    evidenceHash?: string;
    baseDescriptionHash?: string;
  }): Promise<ProductDescriptionJobEntity> {
    const rows = await this.db
      .insert(productDescriptionJobs)
      .values({
        productId: job.productId,
        retryOfJobId: job.retryOfJobId,
        status: job.status ?? 'pending',
        message: job.message ?? '소개 생성 작업이 대기 중입니다.',
        evidenceHash: job.evidenceHash,
        baseDescriptionHash: job.baseDescriptionHash,
      })
      .returning();

    const row = rows[0];
    if (!row) {
      throw new Error('ProductDescriptionJob creation failed');
    }

    return this.toEntity(row);
  }

  /** Lease scheduling compares against the database clock, not the worker clock. */
  private async dbNow(tx: JobDbTx): Promise<Date> {
    const rows = (await tx.execute(sql`select clock_timestamp() as "now"`)) as { now: Date | string }[];
    const raw = rows[0]?.now;
    return raw instanceof Date ? raw : new Date(raw!);
  }

  async findJobById(id: string): Promise<ProductDescriptionJobEntity | null> {
    try {
      const rows = await this.db
        .select()
        .from(productDescriptionJobs)
        .where(eq(productDescriptionJobs.id, id))
        .limit(1);
      const row = rows[0];
      if (!row) {
        return null;
      }

      return this.toEntity(row);
    } catch (error) {
      throw databaseReadFailed(error);
    }
  }

  async claimJobLease(input: {
    jobId: string;
    leaseToken: string;
    leaseUntil: Date;
  }): Promise<ProductDescriptionJobEntity | null> {
    return this.db.transaction(async tx => {
      const [row] = await tx
        .select()
        .from(productDescriptionJobs)
        .where(eq(productDescriptionJobs.id, input.jobId))
        .for('update');
      // Compare against the database clock: the worker clock can drift from
      // the clock that writes run_not_before/lease_until defaults, and a
      // freshly created job must stay claimable in the same instant.
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
          .update(productDescriptionJobs)
          .set({ status: 'failed', error: 'RETRY_EXHAUSTED', leaseToken: null, leaseUntil: null, updatedAt: now })
          .where(eq(productDescriptionJobs.id, row.id));
        return null;
      }
      const [claimed] = await tx
        .update(productDescriptionJobs)
        .set({
          status: 'in_progress',
          message: 'LLM으로 AI 소개를 생성하고 있습니다...',
          leaseToken: input.leaseToken,
          leaseUntil: input.leaseUntil,
          attemptCount: row.attemptCount + 1,
          updatedAt: now,
        })
        .where(eq(productDescriptionJobs.id, row.id))
        .returning();
      return claimed ? this.toEntity(claimed) : null;
    });
  }

  async completeJobLease(
    jobId: string,
    leaseToken: string,
    nextStatus: Extract<ProductDescriptionJobStatus, 'completed' | 'failed' | 'superseded'>,
    options?: UpdateProductDescriptionJobOptions
  ): Promise<ProductDescriptionJobEntity | null> {
    const { commitBefore, ...payload } = options ?? {};
    const [row] = await this.db
      .update(productDescriptionJobs)
      .set({ ...payload, status: nextStatus, updatedAt: new Date() })
      .where(
        and(
          eq(productDescriptionJobs.id, jobId),
          eq(productDescriptionJobs.leaseToken, leaseToken),
          eq(productDescriptionJobs.status, 'in_progress'),
          gt(
            productDescriptionJobs.leaseUntil,
            sql`clock_timestamp() + ${nextStatus === 'completed' ? JOB_COMMIT_MARGIN_MS : 0} * interval '1 millisecond'`
          ),
          commitBefore ? sql`clock_timestamp() < ${commitBefore.toISOString()}::timestamptz` : undefined
        )
      )
      .returning();
    return row ? this.toEntity(row) : null;
  }

  async retryJobLease(jobId: string, leaseToken: string, error: string): Promise<ProductDescriptionJobEntity | null> {
    return this.db.transaction(async tx => {
      const [row] = await tx
        .select()
        .from(productDescriptionJobs)
        .where(
          and(
            eq(productDescriptionJobs.id, jobId),
            eq(productDescriptionJobs.leaseToken, leaseToken),
            eq(productDescriptionJobs.status, 'in_progress')
          )
        )
        .for('update');
      const now = await this.dbNow(tx);
      if (!row || !row.leaseUntil || row.leaseUntil <= now) return null;
      const exhausted = row.attemptCount >= JOB_MAX_ATTEMPTS;
      const retryAt = new Date(now.getTime() + jobRetryDelay(row.attemptCount));
      const [updated] = await tx
        .update(productDescriptionJobs)
        .set({
          status: exhausted ? 'failed' : 'pending',
          error,
          message: exhausted ? 'AI 소개 생성에 실패했습니다.' : 'AI 소개 생성 작업을 재시도합니다.',
          leaseToken: null,
          leaseUntil: null,
          runNotBefore: retryAt,
          nextDispatchAt: retryAt,
          updatedAt: now,
        })
        .where(eq(productDescriptionJobs.id, jobId))
        .returning();
      return updated ? this.toEntity(updated) : null;
    });
  }

  async findRecoverableJobs(input: { now: Date; limit?: number }): Promise<ProductDescriptionJobEntity[]> {
    return this.db.transaction(async tx => {
      const now = await this.dbNow(tx);
      const rows = await tx
        .select()
        .from(productDescriptionJobs)
        .where(
          and(
            lte(productDescriptionJobs.nextDispatchAt, now),
            or(
              and(eq(productDescriptionJobs.status, 'pending'), lte(productDescriptionJobs.runNotBefore, now)),
              and(
                eq(productDescriptionJobs.status, 'in_progress'),
                or(isNull(productDescriptionJobs.leaseUntil), lte(productDescriptionJobs.leaseUntil, now))
              )
            )
          )
        )
        .orderBy(asc(productDescriptionJobs.updatedAt), asc(productDescriptionJobs.id))
        .limit(Math.min(Math.max(input.limit ?? 25, 1), 25))
        .for('update', { skipLocked: true });
      const reserved: ProductDescriptionJobEntity[] = [];
      for (const row of rows) {
        if (row.attemptCount >= JOB_MAX_ATTEMPTS) {
          await tx
            .update(productDescriptionJobs)
            .set({ status: 'failed', error: 'RETRY_EXHAUSTED', leaseToken: null, leaseUntil: null, updatedAt: now })
            .where(eq(productDescriptionJobs.id, row.id));
          continue;
        }
        const [next] = await tx
          .update(productDescriptionJobs)
          .set({ nextDispatchAt: new Date(now.getTime() + JOB_DISPATCH_RESERVATION_MS) })
          .where(eq(productDescriptionJobs.id, row.id))
          .returning();
        if (next) reserved.push(this.toEntity(next));
      }
      return reserved;
    });
  }

  async findJobs(options?: {
    status?: ProductDescriptionJobStatus;
    limit?: number;
    offset?: number;
  }): Promise<ProductDescriptionJobSummary[]> {
    try {
      const limit = Math.min(options?.limit ?? 50, 100);
      const offset = Math.max(options?.offset ?? 0, 0);

      const baseQuery = this.db
        .select({
          id: productDescriptionJobs.id,
          productId: productDescriptionJobs.productId,
          status: productDescriptionJobs.status,
          message: productDescriptionJobs.message,
          error: productDescriptionJobs.error,
          evidenceHash: productDescriptionJobs.evidenceHash,
          evidenceHashVersion: productDescriptionJobs.evidenceHashVersion,
          baseDescriptionHash: productDescriptionJobs.baseDescriptionHash,
          writerModel: productDescriptionJobs.writerModel,
          reviewerModel: productDescriptionJobs.reviewerModel,
          writerPromptVersion: productDescriptionJobs.writerPromptVersion,
          reviewerPromptVersion: productDescriptionJobs.reviewerPromptVersion,
          rendererVersion: productDescriptionJobs.rendererVersion,
          leaseToken: productDescriptionJobs.leaseToken,
          leaseUntil: productDescriptionJobs.leaseUntil,
          attemptCount: productDescriptionJobs.attemptCount,
          runNotBefore: productDescriptionJobs.runNotBefore,
          nextDispatchAt: productDescriptionJobs.nextDispatchAt,
          retryOfJobId: productDescriptionJobs.retryOfJobId,
          appliedAt: productDescriptionJobs.appliedAt,
          createdAt: productDescriptionJobs.createdAt,
          updatedAt: productDescriptionJobs.updatedAt,
        })
        .from(productDescriptionJobs);

      const rows = options?.status
        ? await baseQuery
            .where(eq(productDescriptionJobs.status, options.status))
            .orderBy(desc(productDescriptionJobs.createdAt))
            .limit(limit)
            .offset(offset)
        : await baseQuery.orderBy(desc(productDescriptionJobs.createdAt)).limit(limit).offset(offset);

      return rows.map(row => this.toSummary(row));
    } catch (error) {
      throw databaseReadFailed(error);
    }
  }
}
