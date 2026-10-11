import {
  type ClaimProductResearchJobResult,
  type ProductResearchDraftV1,
  type ProductResearchFailureCode,
  type ProductResearchJobEntity,
  type ProductResearchJobRepository,
  ProductResearchJobRepositoryToken,
} from '@darun/products-domain';
import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { and, eq, isNull, lte, or } from 'drizzle-orm';
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
    try {
      const rows = await this.db.select().from(productResearchJobs).where(eq(productResearchJobs.id, id)).limit(1);
      const row = rows[0];
      return row ? this.toEntity(row) : null;
    } catch (error) {
      console.warn('[PostgresqlProductResearchJobRepository] Failed to find job (table may not exist yet):', error);
      return null;
    }
  }

  async findByRequestKey(requestKey: string): Promise<ProductResearchJobEntity | null> {
    try {
      const rows = await this.db
        .select()
        .from(productResearchJobs)
        .where(eq(productResearchJobs.requestKey, requestKey))
        .limit(1);
      const row = rows[0];
      return row ? this.toEntity(row) : null;
    } catch (error) {
      console.warn('[PostgresqlProductResearchJobRepository] Failed to find job by request key:', error);
      return null;
    }
  }

  async findByProductId(productId: string): Promise<ProductResearchJobEntity | null> {
    try {
      const rows = await this.db
        .select()
        .from(productResearchJobs)
        .where(eq(productResearchJobs.materializedProductId, productId))
        .limit(1);
      const row = rows[0];
      return row ? this.toEntity(row) : null;
    } catch (error) {
      console.warn('[PostgresqlProductResearchJobRepository] Failed to find job by product id:', error);
      return null;
    }
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

  async claimJob(input: {
    jobId: string;
    leaseToken: string;
    leaseUntil: Date;
  }): Promise<ClaimProductResearchJobResult> {
    return this.db.transaction(async tx => {
      const rows = await tx.select().from(productResearchJobs).where(eq(productResearchJobs.id, input.jobId)).limit(1);
      const row = rows[0];
      if (!row) {
        return { claimed: false, job: null };
      }
      const current = this.toEntity(row);
      const now = new Date();
      const claimable =
        current.status === 'pending' ||
        (current.status === 'in_progress' &&
          (current.leaseUntil === null || current.leaseUntil <= now || current.leaseToken === input.leaseToken));
      if (!claimable) {
        return { claimed: false, job: current };
      }

      const updated = await tx
        .update(productResearchJobs)
        .set({
          status: 'in_progress',
          stage: 'searching',
          leaseToken: input.leaseToken,
          leaseUntil: input.leaseUntil,
          attemptCount: current.attemptCount + 1,
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
                or(isNull(productResearchJobs.leaseUntil), lte(productResearchJobs.leaseUntil, now))
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
        return { claimed: false, job: latest[0] ? this.toEntity(latest[0]) : null };
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
}
