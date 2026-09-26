import {
  type ProductDescriptionJobEntity,
  type ProductDescriptionJobRepository,
  ProductDescriptionJobRepositoryToken,
  type ProductDescriptionJobStatus,
  type UpdateProductDescriptionJobOptions,
} from '@darun/products-domain';
import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { desc, eq } from 'drizzle-orm';
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

    const rows = await this.db
      .update(productDescriptionJobs)
      .set(updateValues)
      .where(eq(productDescriptionJobs.id, id))
      .returning();

    const row = rows[0];
    if (!row) {
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
