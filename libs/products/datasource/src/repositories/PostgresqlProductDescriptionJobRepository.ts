import {
  type ProductDescriptionJobEntity,
  type ProductDescriptionJobRepository,
  ProductDescriptionJobRepositoryToken,
  type ProductDescriptionJobStatus,
  type UpdateProductDescriptionJobOptions,
} from '@darun/products-domain';
import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { and, asc, desc, eq, inArray, isNull, lte, or, type SQL } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { type ProductDescriptionJobRow, productDescriptionJobs } from '../entities/ProductDescriptionJobSchema';

@Service(ProductDescriptionJobRepositoryToken)
export class PostgresqlProductDescriptionJobRepository implements ProductDescriptionJobRepository {
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

  private toEntity(row: ProductDescriptionJobRow): ProductDescriptionJobEntity {
    return {
      id: row.id,
      productId: row.productId,
      status: row.status as ProductDescriptionJobStatus,
      message: row.message,
      error: row.error,
      evidenceHash: row.evidenceHash,
      baseDescriptionHash: row.baseDescriptionHash,
      candidateDocument: row.candidateDocument,
      candidateHtml: row.candidateHtml,
      writerModel: row.writerModel,
      reviewerModel: row.reviewerModel,
      writerPromptVersion: row.writerPromptVersion,
      reviewerPromptVersion: row.reviewerPromptVersion,
      rendererVersion: row.rendererVersion,
      leaseToken: row.leaseToken,
      leaseUntil: row.leaseUntil,
      attemptCount: row.attemptCount,
      appliedAt: row.appliedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async createJob(job: {
    productId: string;
    status?: ProductDescriptionJobStatus;
    message?: string;
    evidenceHash?: string;
    baseDescriptionHash?: string;
  }): Promise<ProductDescriptionJobEntity> {
    const rows = await this.db
      .insert(productDescriptionJobs)
      .values({
        productId: job.productId,
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
      console.warn('[PostgresqlProductDescriptionJobRepository] Failed to find job (table may not exist yet):', error);
      return null;
    }
  }

  async updateJobStatus(
    id: string,
    status: ProductDescriptionJobStatus,
    options?: UpdateProductDescriptionJobOptions
  ): Promise<ProductDescriptionJobEntity> {
    const entity = await this.writeJobStatus(id, status, options, eq(productDescriptionJobs.id, id), true);
    if (!entity) {
      throw new Error(`ProductDescriptionJob not found for update: ${id}`);
    }
    return entity;
  }

  async claimJobStatus(
    id: string,
    expectedStatuses: ProductDescriptionJobStatus[],
    nextStatus: ProductDescriptionJobStatus,
    options?: UpdateProductDescriptionJobOptions
  ): Promise<ProductDescriptionJobEntity | null> {
    return this.writeJobStatus(
      id,
      nextStatus,
      options,
      and(eq(productDescriptionJobs.id, id), inArray(productDescriptionJobs.status, expectedStatuses)) ??
        eq(productDescriptionJobs.id, id),
      false
    );
  }

  async claimJobLease(input: {
    jobId: string;
    leaseToken: string;
    leaseUntil: Date;
  }): Promise<ProductDescriptionJobEntity | null> {
    const now = new Date();
    const rows = await this.db
      .update(productDescriptionJobs)
      .set({
        status: 'in_progress',
        message: 'LLM으로 AI 소개를 생성하고 있습니다...',
        leaseToken: input.leaseToken,
        leaseUntil: input.leaseUntil,
        updatedAt: now,
      })
      .where(
        and(
          eq(productDescriptionJobs.id, input.jobId),
          or(
            eq(productDescriptionJobs.status, 'pending'),
            and(
              eq(productDescriptionJobs.status, 'in_progress'),
              or(isNull(productDescriptionJobs.leaseUntil), lte(productDescriptionJobs.leaseUntil, now))
            )
          )
        )
      )
      .returning();
    const row = rows[0];
    if (!row) {
      return null;
    }
    // attempt 소유권은 DB 조건으로 분리한다: lease 선점에 성공한
    // attempt만 attemptCount를 1 증가시킨다.
    const bumped = await this.db
      .update(productDescriptionJobs)
      .set({ attemptCount: row.attemptCount + 1, updatedAt: new Date() })
      .where(
        and(eq(productDescriptionJobs.id, input.jobId), eq(productDescriptionJobs.leaseToken, input.leaseToken))
      )
      .returning();
    return this.toEntity(bumped[0] ?? row);
  }

  async completeJobLease(
    jobId: string,
    leaseToken: string,
    nextStatus: Extract<ProductDescriptionJobStatus, 'completed' | 'failed' | 'superseded'>,
    options?: UpdateProductDescriptionJobOptions
  ): Promise<ProductDescriptionJobEntity | null> {
    // lease 소유권과 함께 in_progress에서만 확정한다. 이미
    // completed/failed/superseded로 끝난 행은 늦은 쓰기로 덮어쓰지 않는다.
    return this.writeJobStatus(
      jobId,
      nextStatus,
      options,
      and(
        eq(productDescriptionJobs.id, jobId),
        eq(productDescriptionJobs.leaseToken, leaseToken),
        eq(productDescriptionJobs.status, 'in_progress')
      ) ?? eq(productDescriptionJobs.id, jobId),
      false
    );
  }

  async findRecoverableJobs(input: { now: Date; limit?: number }): Promise<ProductDescriptionJobEntity[]> {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    try {
      const rows = await this.db
        .select()
        .from(productDescriptionJobs)
        .where(
          or(
            eq(productDescriptionJobs.status, 'pending'),
            and(
              eq(productDescriptionJobs.status, 'in_progress'),
              or(isNull(productDescriptionJobs.leaseUntil), lte(productDescriptionJobs.leaseUntil, input.now))
            )
          )
        )
        .orderBy(asc(productDescriptionJobs.updatedAt))
        .limit(limit);
      return rows.map(row => this.toEntity(row));
    } catch (error) {
      console.warn('[PostgresqlProductDescriptionJobRepository] Failed to find recoverable jobs:', error);
      return [];
    }
  }

  private async writeJobStatus(
    id: string,
    status: ProductDescriptionJobStatus,
    options: UpdateProductDescriptionJobOptions | undefined,
    condition: SQL<unknown>,
    throwOnMissing: boolean
  ): Promise<ProductDescriptionJobEntity | null> {
    const updateValues: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    if (options?.message !== undefined) {
      updateValues.message = options.message;
    }
    if (options?.error !== undefined) {
      updateValues.error = options.error;
    }
    if (options?.evidenceHash !== undefined) {
      updateValues.evidenceHash = options.evidenceHash;
    }
    if (options?.baseDescriptionHash !== undefined) {
      updateValues.baseDescriptionHash = options.baseDescriptionHash;
    }
    if (options?.candidateDocument !== undefined) {
      updateValues.candidateDocument = options.candidateDocument;
    }
    if (options?.candidateHtml !== undefined) {
      updateValues.candidateHtml = options.candidateHtml;
    }
    if (options?.writerModel !== undefined) {
      updateValues.writerModel = options.writerModel;
    }
    if (options?.reviewerModel !== undefined) {
      updateValues.reviewerModel = options.reviewerModel;
    }
    if (options?.writerPromptVersion !== undefined) {
      updateValues.writerPromptVersion = options.writerPromptVersion;
    }
    if (options?.reviewerPromptVersion !== undefined) {
      updateValues.reviewerPromptVersion = options.reviewerPromptVersion;
    }
    if (options?.rendererVersion !== undefined) {
      updateValues.rendererVersion = options.rendererVersion;
    }
    if (options?.appliedAt !== undefined) {
      updateValues.appliedAt = options.appliedAt;
    }

    const rows = await this.db.update(productDescriptionJobs).set(updateValues).where(condition).returning();

    const row = rows[0];
    if (!row) {
      if (!throwOnMissing) {
        return null;
      }
      throw new Error(`ProductDescriptionJob not found for update: ${id}`);
    }

    return this.toEntity(row);
  }

  async markApplied(id: string, appliedAt: Date = new Date()): Promise<ProductDescriptionJobEntity> {
    const rows = await this.db
      .update(productDescriptionJobs)
      .set({
        appliedAt,
        updatedAt: new Date(),
      })
      .where(eq(productDescriptionJobs.id, id))
      .returning();

    const row = rows[0];
    if (!row) {
      throw new Error(`ProductDescriptionJob not found for markApplied: ${id}`);
    }

    return this.toEntity(row);
  }

  async findJobs(options?: {
    status?: ProductDescriptionJobStatus;
    limit?: number;
    offset?: number;
  }): Promise<ProductDescriptionJobEntity[]> {
    try {
      const limit = Math.min(options?.limit ?? 50, 100);
      const offset = Math.max(options?.offset ?? 0, 0);

      const baseQuery = this.db.select().from(productDescriptionJobs);

      const rows = options?.status
        ? await baseQuery
            .where(eq(productDescriptionJobs.status, options.status))
            .orderBy(desc(productDescriptionJobs.createdAt))
            .limit(limit)
            .offset(offset)
        : await baseQuery.orderBy(desc(productDescriptionJobs.createdAt)).limit(limit).offset(offset);

      return rows.map(row => this.toEntity(row));
    } catch (error) {
      console.warn('[PostgresqlProductDescriptionJobRepository] Failed to find jobs (table may not exist yet):', error);
      return [];
    }
  }
}
