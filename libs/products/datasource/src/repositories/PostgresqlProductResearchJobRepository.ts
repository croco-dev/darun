import {
  type ClaimProductResearchJobResult,
  type ProductResearchDraftV1,
  type ProductResearchFailureCode,
  type ProductResearchJobEntity,
  type ProductResearchJobRepository,
  ProductResearchJobRepositoryToken,
} from '@darun/products-domain';
import { Drizzle, DrizzleToken } from '@darun/provider-database';
import {
  JOB_COMMIT_MARGIN_MS,
  JOB_DISPATCH_RESERVATION_MS,
  JOB_MAX_ATTEMPTS,
  jobDispatchStatus,
  jobRetryDelay,
} from '@darun/utils-llm';
import { and, asc, eq, gt, isNull, lte, or, sql } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { type ProductResearchJobRow, productResearchJobs } from '../entities/ProductResearchJobSchema';

function parseResult(raw: string | null): ProductResearchDraftV1 | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as ProductResearchDraftV1;
    return parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

type JobDbTx = Parameters<Parameters<Drizzle['transaction']>[0]>[0];

@Service(ProductResearchJobRepositoryToken)
export class PostgresqlProductResearchJobRepository implements ProductResearchJobRepository {
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

  /** Lease scheduling compares against the database clock, not the worker clock. */
  private async dbNow(tx: JobDbTx): Promise<Date> {
    const rows = (await tx.execute(sql`select clock_timestamp() as "now"`)) as { now: Date | string }[];
    const raw = rows[0]?.now;
    return raw instanceof Date ? raw : new Date(raw!);
  }
  private toEntity(row: ProductResearchJobRow): ProductResearchJobEntity {
    return {
      id: row.id,
      requestKey: row.requestKey,
      officialUrl: row.officialUrl,
      status: row.status as ProductResearchJobEntity['status'],
      stage: (row.stage ?? null) as ProductResearchJobEntity['stage'],
      errorCode: (row.errorCode ?? null) as ProductResearchJobEntity['errorCode'],
      errorMessage: row.errorMessage,
      result: parseResult(row.resultJson),
      sourceSnapshotHash: row.sourceSnapshotHash,
      promptVersion: row.promptVersion,
      model: row.model,
      leaseToken: row.leaseToken,
      leaseUntil: row.leaseUntil,
      attemptCount: row.attemptCount,
      runNotBefore: row.runNotBefore,
      nextDispatchAt: row.nextDispatchAt,
      retryOfJobId: row.retryOfJobId,
      dispatchStatus: jobDispatchStatus(row),
      materializedProductId: row.materializedProductId,
      appliedAt: row.appliedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findById(id: string): Promise<ProductResearchJobEntity | null> {
    const rows = await this.db.select().from(productResearchJobs).where(eq(productResearchJobs.id, id)).limit(1);
    const row = rows[0];
    return row ? this.toEntity(row) : null;
  }

  async findByRequestKey(requestKey: string): Promise<ProductResearchJobEntity | null> {
    const rows = await this.db
      .select()
      .from(productResearchJobs)
      .where(eq(productResearchJobs.requestKey, requestKey))
      .limit(1);
    const row = rows[0];
    return row ? this.toEntity(row) : null;
  }

  async findByProductId(productId: string): Promise<ProductResearchJobEntity | null> {
    const rows = await this.db
      .select()
      .from(productResearchJobs)
      .where(eq(productResearchJobs.materializedProductId, productId))
      .limit(1);
    const row = rows[0];
    return row ? this.toEntity(row) : null;
  }

  async createPendingJob(input: {
    requestKey: string;
    officialUrl: string;
    retryOfJobId?: string;
  }): Promise<ProductResearchJobEntity> {
    const rows = await this.db
      .insert(productResearchJobs)
      .values({
        requestKey: input.requestKey,
        officialUrl: input.officialUrl,
        retryOfJobId: input.retryOfJobId,
        status: 'pending',
      })
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error('ProductResearchJob creation failed');
    }
    return this.toEntity(row);
  }

  async claimJob(input: {
    jobId: string;
    leaseToken: string;
    leaseUntil: Date;
  }): Promise<ClaimProductResearchJobResult> {
    return this.db.transaction(async tx => {
      const [row] = await tx
        .select()
        .from(productResearchJobs)
        .where(eq(productResearchJobs.id, input.jobId))
        .for('update');
      // Compare against the database clock so a freshly created job stays
      // claimable even when the worker clock trails the database clock.
      const now = await this.dbNow(tx);
      if (!row) return { claimed: false, job: null };
      if (
        (row.status !== 'pending' && row.status !== 'in_progress') ||
        (row.status === 'pending' && row.runNotBefore > now) ||
        (row.status === 'in_progress' && row.leaseUntil && row.leaseUntil > now)
      )
        return { claimed: false, job: this.toEntity(row) };
      if (row.attemptCount >= JOB_MAX_ATTEMPTS) {
        const [failed] = await tx
          .update(productResearchJobs)
          .set({
            status: 'failed',
            stage: null,
            errorCode: 'RETRY_EXHAUSTED',
            errorMessage: '재시도 횟수를 초과했습니다.',
            leaseToken: null,
            leaseUntil: null,
            updatedAt: now,
          })
          .where(eq(productResearchJobs.id, row.id))
          .returning();
        return { claimed: false, job: failed ? this.toEntity(failed) : null };
      }
      const [claimed] = await tx
        .update(productResearchJobs)
        .set({
          status: 'in_progress',
          stage: 'searching',
          leaseToken: input.leaseToken,
          leaseUntil: input.leaseUntil,
          attemptCount: row.attemptCount + 1,
          updatedAt: now,
        })
        .where(eq(productResearchJobs.id, row.id))
        .returning();
      return claimed ? { claimed: true, job: this.toEntity(claimed) } : { claimed: false, job: null };
    });
  }

  async completeJob(input: {
    jobId: string;
    leaseToken: string;
    result: ProductResearchDraftV1;
    sourceSnapshotHash: string;
    promptVersion: string;
    model: string;
    commitBefore?: Date;
  }): Promise<ProductResearchJobEntity | null> {
    const rows = await this.db
      .update(productResearchJobs)
      .set({
        status: 'completed',
        stage: null,
        resultJson: JSON.stringify(input.result),
        sourceSnapshotHash: input.sourceSnapshotHash,
        promptVersion: input.promptVersion,
        model: input.model,
        errorCode: null,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(productResearchJobs.id, input.jobId),
          eq(productResearchJobs.leaseToken, input.leaseToken),
          eq(productResearchJobs.status, 'in_progress'),
          gt(
            productResearchJobs.leaseUntil,
            sql`clock_timestamp() + ${JOB_COMMIT_MARGIN_MS} * interval '1 millisecond'`
          ),
          input.commitBefore ? sql`clock_timestamp() < ${input.commitBefore.toISOString()}::timestamptz` : undefined
        )
      )
      .returning();
    const row = rows[0];
    return row ? this.toEntity(row) : null;
  }

  async failJob(input: {
    jobId: string;
    leaseToken: string;
    errorCode: ProductResearchFailureCode;
    errorMessage: string;
  }): Promise<ProductResearchJobEntity | null> {
    const rows = await this.db
      .update(productResearchJobs)
      .set({
        status: 'failed',
        stage: null,
        errorCode: input.errorCode,
        errorMessage: input.errorMessage,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(productResearchJobs.id, input.jobId),
          eq(productResearchJobs.leaseToken, input.leaseToken),
          eq(productResearchJobs.status, 'in_progress'),
          gt(productResearchJobs.leaseUntil, new Date())
        )
      )
      .returning();
    const row = rows[0];
    return row ? this.toEntity(row) : null;
  }

  async retryJobLease(input: {
    jobId: string;
    leaseToken: string;
    errorCode: ProductResearchFailureCode;
    errorMessage: string;
  }): Promise<ProductResearchJobEntity | null> {
    return this.db.transaction(async tx => {
      const [row] = await tx
        .select()
        .from(productResearchJobs)
        .where(
          and(
            eq(productResearchJobs.id, input.jobId),
            eq(productResearchJobs.leaseToken, input.leaseToken),
            eq(productResearchJobs.status, 'in_progress')
          )
        )
        .for('update');
      const now = await this.dbNow(tx);
      if (!row || !row.leaseUntil || row.leaseUntil <= now) return null;
      const retryAt = new Date(now.getTime() + jobRetryDelay(row.attemptCount));
      const [updated] = await tx
        .update(productResearchJobs)
        .set({
          status: row.attemptCount >= JOB_MAX_ATTEMPTS ? 'failed' : 'pending',
          stage: null,
          errorCode: input.errorCode,
          errorMessage: input.errorMessage,
          leaseToken: null,
          leaseUntil: null,
          runNotBefore: retryAt,
          nextDispatchAt: retryAt,
          updatedAt: now,
        })
        .where(eq(productResearchJobs.id, row.id))
        .returning();
      return updated ? this.toEntity(updated) : null;
    });
  }

  async findRecoverableJobs(input: { now: Date; limit?: number }): Promise<ProductResearchJobEntity[]> {
    return this.db.transaction(async tx => {
      const now = await this.dbNow(tx);
      const rows = await tx
        .select()
        .from(productResearchJobs)
        .where(
          and(
            lte(productResearchJobs.nextDispatchAt, now),
            or(
              and(eq(productResearchJobs.status, 'pending'), lte(productResearchJobs.runNotBefore, now)),
              and(
                eq(productResearchJobs.status, 'in_progress'),
                or(isNull(productResearchJobs.leaseUntil), lte(productResearchJobs.leaseUntil, now))
              )
            )
          )
        )
        .orderBy(asc(productResearchJobs.updatedAt), asc(productResearchJobs.id))
        .limit(Math.min(Math.max(input.limit ?? 25, 1), 25))
        .for('update', { skipLocked: true });
      const reserved: ProductResearchJobEntity[] = [];
      for (const row of rows) {
        if (row.attemptCount >= JOB_MAX_ATTEMPTS) {
          await tx
            .update(productResearchJobs)
            .set({
              status: 'failed',
              stage: null,
              errorCode: 'RETRY_EXHAUSTED',
              errorMessage: '재시도 횟수를 초과했습니다.',
              leaseToken: null,
              leaseUntil: null,
              updatedAt: now,
            })
            .where(eq(productResearchJobs.id, row.id));
          continue;
        }
        const [next] = await tx
          .update(productResearchJobs)
          .set({ nextDispatchAt: new Date(now.getTime() + JOB_DISPATCH_RESERVATION_MS) })
          .where(eq(productResearchJobs.id, row.id))
          .returning();
        if (next) reserved.push(this.toEntity(next));
      }
      return reserved;
    });
  }
}
