import {
  type ProductDescriptionJobEntity,
  type ProductDescriptionJobRepository,
  ProductDescriptionJobRepositoryToken,
  type ProductDescriptionJobStatus,
} from '@darun/products-domain';
import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { desc, eq } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { productDescriptionJobs } from '../entities/ProductDescriptionJobSchema';

@Service(ProductDescriptionJobRepositoryToken)
export class PostgresqlProductDescriptionJobRepository implements ProductDescriptionJobRepository {
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

  async createJob(job: {
    productId: string;
    status?: ProductDescriptionJobStatus;
    message?: string;
  }): Promise<ProductDescriptionJobEntity> {
    const rows = await this.db
      .insert(productDescriptionJobs)
      .values({
        productId: job.productId,
        status: job.status ?? 'pending',
        message: job.message ?? '소개 생성 작업이 대기 중입니다.',
      })
      .returning();

    const row = rows[0];
    if (!row) {
      throw new Error('ProductDescriptionJob creation failed');
    }

    return {
      id: row.id,
      productId: row.productId,
      status: row.status as ProductDescriptionJobStatus,
      message: row.message,
      error: row.error,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
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

      return {
        id: row.id,
        productId: row.productId,
        status: row.status as ProductDescriptionJobStatus,
        message: row.message,
        error: row.error,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    } catch (error) {
      console.warn('[PostgresqlProductDescriptionJobRepository] Failed to find job (table may not exist yet):', error);
      return null;
    }
  }

  async updateJobStatus(
    id: string,
    status: ProductDescriptionJobStatus,
    options?: { message?: string | null; error?: string | null }
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

    const rows = await this.db
      .update(productDescriptionJobs)
      .set(updateValues)
      .where(eq(productDescriptionJobs.id, id))
      .returning();

    const row = rows[0];
    if (!row) {
      throw new Error(`ProductDescriptionJob not found for update: ${id}`);
    }

    return {
      id: row.id,
      productId: row.productId,
      status: row.status as ProductDescriptionJobStatus,
      message: row.message,
      error: row.error,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
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

      return rows.map(row => ({
        id: row.id,
        productId: row.productId,
        status: row.status as ProductDescriptionJobStatus,
        message: row.message,
        error: row.error,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));
    } catch (error) {
      console.warn('[PostgresqlProductDescriptionJobRepository] Failed to find jobs (table may not exist yet):', error);
      return [];
    }
  }
}
