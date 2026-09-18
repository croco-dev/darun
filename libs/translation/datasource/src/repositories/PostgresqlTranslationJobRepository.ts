import { Drizzle, DrizzleToken } from '@darun/provider-database';
import {
  type TranslationJobEntity,
  type TranslationJobRepository,
  TranslationJobRepositoryToken,
  type TranslationJobStatus,
} from '@darun/translation-domain';
import { desc, eq } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { translationJobs } from '../entities/TranslationJobSchema';

@Service(TranslationJobRepositoryToken)
export class PostgresqlTranslationJobRepository implements TranslationJobRepository {
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

  async createJob(job: {
    entityType: string;
    entityId: string;
    locale?: string;
    status?: TranslationJobStatus;
    message?: string;
  }): Promise<TranslationJobEntity> {
    const rows = await this.db
      .insert(translationJobs)
      .values({
        entityType: job.entityType,
        entityId: job.entityId,
        locale: job.locale ?? 'en',
        status: job.status ?? 'pending',
        message: job.message ?? '번역 작업이 대기 중입니다.',
      })
      .returning();

    const row = rows[0];
    if (!row) {
      throw new Error('TranslationJob creation failed');
    }

    return {
      id: row.id,
      entityType: row.entityType,
      entityId: row.entityId,
      locale: row.locale,
      status: row.status as TranslationJobStatus,
      message: row.message,
      error: row.error,
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

      return {
        id: row.id,
        entityType: row.entityType,
        entityId: row.entityId,
        locale: row.locale,
        status: row.status as TranslationJobStatus,
        message: row.message,
        error: row.error,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    } catch (error) {
      console.warn('[PostgresqlTranslationJobRepository] Failed to find job (table may not exist yet):', error);
      return null;
    }
  }

  async updateJobStatus(
    id: string,
    status: TranslationJobStatus,
    options?: { message?: string | null; error?: string | null }
  ): Promise<TranslationJobEntity> {
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

    const rows = await this.db.update(translationJobs).set(updateValues).where(eq(translationJobs.id, id)).returning();

    const row = rows[0];
    if (!row) {
      throw new Error(`TranslationJob not found for update: ${id}`);
    }

    return {
      id: row.id,
      entityType: row.entityType,
      entityId: row.entityId,
      locale: row.locale,
      status: row.status as TranslationJobStatus,
      message: row.message,
      error: row.error,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findJobs(options?: {
    status?: TranslationJobStatus;
    limit?: number;
    offset?: number;
  }): Promise<TranslationJobEntity[]> {
    try {
      const limit = options?.limit ?? 50;
      const offset = options?.offset ?? 0;

      let query = this.db.select().from(translationJobs);
      if (options?.status) {
        query = query.where(eq(translationJobs.status, options.status)) as typeof query;
      }

      const rows = await query.orderBy(desc(translationJobs.createdAt)).limit(limit).offset(offset);

      return rows.map(row => ({
        id: row.id,
        entityType: row.entityType,
        entityId: row.entityId,
        locale: row.locale,
        status: row.status as TranslationJobStatus,
        message: row.message,
        error: row.error,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));
    } catch (error) {
      console.warn('[PostgresqlTranslationJobRepository] Failed to find jobs:', error);
      return [];
    }
  }
}
