import { Drizzle, DrizzleToken } from '@darun/provider-database';
import {
  type TranslationJobEntity,
  type TranslationJobRepository,
  TranslationJobRepositoryToken,
  type TranslationJobStatus,
} from '@darun/translation-domain';
import { and, asc, desc, eq, inArray, isNull, lte, or } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { translationJobs } from '../entities/TranslationJobSchema';

type TranslationJobStatusOptions = {
  message?: string | null;
  error?: string | null;
  sourceHash?: string | null;
  model?: string | null;
  promptVersion?: string | null;
};

@Service(TranslationJobRepositoryToken)
export class PostgresqlTranslationJobRepository implements TranslationJobRepository {
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

  async createJob(job: {
    entityType: string;
    entityId: string;
    locale?: string;
    status?: TranslationJobStatus;
    message?: string;
    sourceHash?: string | null;
    model?: string | null;
    promptVersion?: string | null;
  }): Promise<TranslationJobEntity> {
    const rows = await this.db
      .insert(translationJobs)
      .values({
        entityType: job.entityType,
        entityId: job.entityId,
        locale: job.locale ?? 'en',
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
    status: string;
    message: string | null;
    error: string | null;
    sourceHash: string | null;
    model: string | null;
    promptVersion: string | null;
    leaseToken: string | null;
    leaseUntil: Date | null;
    attemptCount: number;
    createdAt: Date;
    updatedAt: Date;
  }): TranslationJobEntity {
    return {
      id: row.id,
      entityType: row.entityType,
      entityId: row.entityId,
      locale: row.locale,
      status: row.status as TranslationJobStatus,
      message: row.message,
      error: row.error,
      sourceHash: row.sourceHash,
      model: row.model,
      promptVersion: row.promptVersion,
      leaseToken: row.leaseToken,
      leaseUntil: row.leaseUntil,
      attemptCount: row.attemptCount,
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

  async updateJobStatus(
    id: string,
    status: TranslationJobStatus,
    options?: {
      message?: string | null;
      error?: string | null;
      sourceHash?: string | null;
      model?: string | null;
      promptVersion?: string | null;
    }
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
    if (options?.sourceHash !== undefined) {
      updateValues.sourceHash = options.sourceHash;
    }
    if (options?.model !== undefined) {
      updateValues.model = options.model;
    }
    if (options?.promptVersion !== undefined) {
      updateValues.promptVersion = options.promptVersion;
    }

    const rows = await this.db.update(translationJobs).set(updateValues).where(eq(translationJobs.id, id)).returning();

    const row = rows[0];
    if (!row) {
      throw new Error(`TranslationJob not found for update: ${id}`);
    }

    return this.toEntity(row);
  }

  async claimJobStatus(
    id: string,
    expectedStatuses: TranslationJobStatus[],
    nextStatus: TranslationJobStatus,
    options?: {
      message?: string | null;
      error?: string | null;
      sourceHash?: string | null;
      model?: string | null;
      promptVersion?: string | null;
    }
  ): Promise<TranslationJobEntity | null> {
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

    const rows = await this.db
      .update(translationJobs)
      .set(updateValues)
      .where(and(eq(translationJobs.id, id), inArray(translationJobs.status, expectedStatuses)))
      .returning();

    const row = rows[0];
    if (!row) {
      return null;
    }

    return this.toEntity(row);
  }

  async claimJobLease(input: {
    jobId: string;
    leaseToken: string;
    leaseUntil: Date;
  }): Promise<TranslationJobEntity | null> {
    const now = new Date();
    const rows = await this.db
      .update(translationJobs)
      .set({
        status: 'in_progress',
        message: 'LLM으로 영문 번역을 생성하고 있습니다...',
        leaseToken: input.leaseToken,
        leaseUntil: input.leaseUntil,
        updatedAt: now,
      })
      .where(
        and(
          eq(translationJobs.id, input.jobId),
          or(
            eq(translationJobs.status, 'pending'),
            and(
              eq(translationJobs.status, 'in_progress'),
              or(isNull(translationJobs.leaseUntil), lte(translationJobs.leaseUntil, now))
            )
          )
        )
      )
      .returning();
    const claimed = rows[0];
    if (!claimed) {
      return null;
    }
    const bumped = await this.db
      .update(translationJobs)
      .set({ attemptCount: claimed.attemptCount + 1, updatedAt: new Date() })
      .where(and(eq(translationJobs.id, input.jobId), eq(translationJobs.leaseToken, input.leaseToken)))
      .returning();
    return this.toEntity(bumped[0] ?? claimed);
  }

  async completeJobLease(
    jobId: string,
    leaseToken: string,
    nextStatus: Extract<TranslationJobStatus, 'completed' | 'failed' | 'superseded'>,
    options?: TranslationJobStatusOptions
  ): Promise<TranslationJobEntity | null> {
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
          eq(translationJobs.status, 'in_progress')
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

  async findRecoverableJobs(input: { now: Date; limit?: number }): Promise<TranslationJobEntity[]> {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    try {
      const rows = await this.db
        .select()
        .from(translationJobs)
        .where(
          or(
            eq(translationJobs.status, 'pending'),
            and(
              eq(translationJobs.status, 'in_progress'),
              or(isNull(translationJobs.leaseUntil), lte(translationJobs.leaseUntil, input.now))
            )
          )
        )
        .orderBy(asc(translationJobs.updatedAt))
        .limit(limit);
      return rows.map(row => this.toEntity(row));
    } catch (error) {
      console.warn('[PostgresqlTranslationJobRepository] Failed to find recoverable jobs:', error);
      return [];
    }
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

      return rows.map(row => this.toEntity(row));
    } catch (error) {
      console.warn('[PostgresqlTranslationJobRepository] Failed to find jobs:', error);
      return [];
    }
  }
}
