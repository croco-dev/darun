import {
  type ClaimProductResearchJobResult,
  type ProductResearchDraftV1,
  type ProductResearchFailureCode,
  type ProductResearchJobEntity,
  type ProductResearchJobRepository,
  type ProductResearchJobStatus,
  ProductResearchJobRepositoryToken,
} from '@darun/products-domain';
import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { and, asc, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm';
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

@Service(ProductResearchJobRepositoryToken)
export class PostgresqlProductResearchJobRepository implements ProductResearchJobRepository {
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

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

  async createPendingJob(input: { requestKey: string; officialUrl: string }): Promise<ProductResearchJobEntity> {
    const rows = await this.db
      .insert(productResearchJobs)
      .values({
        requestKey: input.requestKey,
        officialUrl: input.officialUrl,
        status: 'pending',
      })
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error('ProductResearchJob creation failed');
    }
    return this.toEntity(row);
  }

  async requeueFailedJob(input: {
    jobId: string;
    expectedStatuses: ProductResearchJobStatus[];
  }): Promise<ProductResearchJobEntity | null> {
    const rows = await this.db
      .update(productResearchJobs)
      .set({
        status: 'pending',
        stage: null,
        errorCode: null,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(and(eq(productResearchJobs.id, input.jobId), inArray(productResearchJobs.status, input.expectedStatuses)))
      .returning();
    const row = rows[0];
    return row ? this.toEntity(row) : null;
  }

  async claimJob(input: {
    jobId: string;
    leaseToken: string;
    leaseUntil: Date;
    maxAttempts?: number;
  }): Promise<ClaimProductResearchJobResult> {
    return this.db.transaction(async tx => {
      const rows = await tx.select().from(productResearchJobs).where(eq(productResearchJobs.id, input.jobId)).limit(1);
      const row = rows[0];
      if (!row) {
        return { claimed: false, job: null };
      }
      const current = this.toEntity(row);
      const now = new Date();
      const leaseExpired = current.leaseUntil === null || current.leaseUntil <= now;
      const sameTokenReentry =
        current.status === 'in_progress' && current.leaseToken !== null && current.leaseToken === input.leaseToken;
      const claimable =
        current.status === 'pending' || (current.status === 'in_progress' && (leaseExpired || sameTokenReentry));
      if (!claimable) {
        return { claimed: false, job: current };
      }
      const maxAttempts = input.maxAttempts ?? 5;
      const reclaimable = current.status === 'in_progress' && (leaseExpired || sameTokenReentry);
      const exhaustedLeaseGuard =
        current.leaseToken === null
          ? isNull(productResearchJobs.leaseToken)
          : eq(productResearchJobs.leaseToken, current.leaseToken);
      if (current.attemptCount >= maxAttempts && (current.status === 'pending' || reclaimable)) {
        const exhausted = await tx
          .update(productResearchJobs)
          .set({
            status: 'failed',
            stage: null,
            errorCode: 'RETRY_EXHAUSTED',
            errorMessage: '재시도 횟수를 초과했습니다.',
            leaseToken: null,
            leaseUntil: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(productResearchJobs.id, input.jobId),
              eq(productResearchJobs.status, current.status),
              reclaimable
                ? and(
                    exhaustedLeaseGuard,
                    or(
                      isNull(productResearchJobs.leaseUntil),
                      lte(productResearchJobs.leaseUntil, now),
                      eq(productResearchJobs.leaseToken, input.leaseToken)
                    )
                  )
                : eq(productResearchJobs.status, 'pending')
            )
          )
          .returning();
        const terminal = exhausted[0];
        return { claimed: false, job: terminal ? this.toEntity(terminal) : current };
      }

      const updated = await tx
        .update(productResearchJobs)
        .set({
          status: 'in_progress',
          stage: 'searching',
          leaseToken: input.leaseToken,
          leaseUntil: input.leaseUntil,
          attemptCount: sql`${productResearchJobs.attemptCount} + 1`,
          errorCode: null,
          errorMessage: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(productResearchJobs.id, input.jobId),
            or(
              eq(productResearchJobs.status, 'pending'),
              and(
                eq(productResearchJobs.status, 'in_progress'),
                or(
                  isNull(productResearchJobs.leaseUntil),
                  lte(productResearchJobs.leaseUntil, now),
                  eq(productResearchJobs.leaseToken, input.leaseToken)
                )
              )
            )
          )
        )
        .returning();

      const next = updated[0];
      if (!next) {
        const latest = await tx
          .select()
          .from(productResearchJobs)
          .where(eq(productResearchJobs.id, input.jobId))
          .limit(1);
        if (!latest[0]) {
          return { claimed: false, job: null };
        }
        return { claimed: false, job: this.toEntity(latest[0]) };
      }
      return { claimed: true, job: this.toEntity(next) };
    });
  }

  async completeJob(input: {
    jobId: string;
    leaseToken: string;
    result: ProductResearchDraftV1;
    sourceSnapshotHash: string;
    promptVersion: string;
    model: string;
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
      .where(and(eq(productResearchJobs.id, input.jobId), eq(productResearchJobs.leaseToken, input.leaseToken)))
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
      .where(and(eq(productResearchJobs.id, input.jobId), eq(productResearchJobs.leaseToken, input.leaseToken)))
      .returning();
    const row = rows[0];
    return row ? this.toEntity(row) : null;
  }

  async markMaterialized(input: { jobId: string; productId: string }): Promise<ProductResearchJobEntity | null> {
    const rows = await this.db
      .update(productResearchJobs)
      .set({
        materializedProductId: input.productId,
        appliedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(productResearchJobs.id, input.jobId))
      .returning();
    const row = rows[0];
    return row ? this.toEntity(row) : null;
  }

  async findRecoverableJobs(input: { now: Date; limit?: number }): Promise<ProductResearchJobEntity[]> {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    try {
      const rows = await this.db
        .select()
        .from(productResearchJobs)
        .where(
          or(
            eq(productResearchJobs.status, 'pending'),
            and(
              eq(productResearchJobs.status, 'in_progress'),
              or(isNull(productResearchJobs.leaseUntil), lte(productResearchJobs.leaseUntil, input.now))
            )
          )
        )
        .orderBy(asc(productResearchJobs.updatedAt))
        .limit(limit);
      return rows.map(row => this.toEntity(row));
    } catch (error) {
      console.warn('[PostgresqlProductResearchJobRepository] Failed to find recoverable jobs:', error);
      return [];
    }
  }
}
