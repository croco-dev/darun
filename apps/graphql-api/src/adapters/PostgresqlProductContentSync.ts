import {
  productNotFound,
  type ProductContentSync,
  type ProductContentSyncStatus,
  type ProductContentSyncOverview,
} from '@darun/products-domain';
import { Drizzle, DrizzleToken } from '@darun/provider-database';
import {
  SearchableProduct,
  SearchableProductRepositoryToken,
  type SearchableProductRepository,
} from '@darun/search-domain';
import { translationMeaning } from '@darun/translation-datasource';
import { JOB_MAX_ATTEMPTS, jobDispatchStatus } from '@darun/utils-llm';
import { and, asc, desc, eq, gt, inArray, isNull, lt, lte, or, sql } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { Inject, Service } from 'typedi';
import { randomUUID } from 'node:crypto';
import { productContentSyncIntents } from '../../../../libs/products/datasource/src/entities/ProductContentSyncIntentSchema';
import { products } from '../../../../libs/products/datasource/src/entities/ProductSchema';
import { readProductDescriptionEvidenceSources } from '../../../../libs/products/datasource/src/repositories/PostgresqlProductDescriptionEvidenceAssembler';
import {
  type ProductContentSource,
  type ProductContentSyncRegistrar,
} from '../../../../libs/products/datasource/src/repositories/productContentSync';
import { lockProductSource } from '../../../../libs/products/datasource/src/repositories/productSourceMutex';
import { ProductContentSyncQueueService } from '../../../../libs/products/service/src/ProductContentSyncQueueService';
import { translationJobs } from '../../../../libs/translation/datasource/src/entities/TranslationJobSchema';

function translationSource(source: ProductContentSource): string {
  return JSON.stringify({
    name: source.product.name.trim(),
    summary: source.product.summary.trim(),
    description: translationMeaning(source.product.description),
    features: [...source.features]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(({ id, name, summary }) => ({ id, name: name.trim(), summary: summary?.trim() ?? '' })),
  });
}
function status(row: typeof productContentSyncIntents.$inferSelect): ProductContentSyncStatus {
  return {
    intentId: row.id,
    productId: row.productId,
    sourceRevision: row.sourceRevision.toString(),
    status: row.status,
    attemptCount: row.attemptCount,
    ...(row.error ? { error: row.error } : {}),
    dispatchStatus:
      row.kind === 'translation'
        ? 'REGISTERED'
        : jobDispatchStatus({
            status: row.status,
            runNotBefore: row.retryAfter,
            nextDispatchAt: row.dispatchAfter,
            leaseUntil: row.leaseUntil,
          }),
    ...(row.translationJobId ? { translationJobId: row.translationJobId } : {}),
  };
}

export const registerProductContentSync: ProductContentSyncRegistrar['register'] = async (tx, input) => {
  const productId = input.after.product.id;
  const kinds: Array<'search' | 'translation'> = ['search'];
  if (!input.before.product.publishedAt || translationSource(input.before) !== translationSource(input.after))
    kinds.push('translation');
  for (const kind of kinds) {
    let translationJobId: string | undefined;
    if (kind === 'translation') {
      const key = `sync:${productId}:${input.sourceRevision}:translation`;
      const [job] = await tx
        .insert(translationJobs)
        .values({
          entityType: 'Product',
          entityId: productId,
          locale: 'en',
          fields: ['name', 'summary', 'description', 'features'],
          idempotencyKey: key,
          status: 'pending',
        })
        .onConflictDoUpdate({ target: translationJobs.idempotencyKey, set: { idempotencyKey: key } })
        .returning();
      if (!job) throw new Error('Translation sync job registration failed');
      translationJobId = job.id;
    }
    await tx
      .insert(productContentSyncIntents)
      .values({ productId, sourceRevision: input.sourceRevision, kind, translationJobId })
      .onConflictDoNothing({
        target: [
          productContentSyncIntents.productId,
          productContentSyncIntents.sourceRevision,
          productContentSyncIntents.kind,
        ],
      });
    // Only a real newer intent of the SAME kind can replace an older intention.
    const replaced = await tx
      .update(productContentSyncIntents)
      .set({ status: 'superseded', updatedAt: new Date() })
      .where(
        and(
          eq(productContentSyncIntents.productId, productId),
          eq(productContentSyncIntents.kind, kind),
          sql`${productContentSyncIntents.sourceRevision} < ${input.sourceRevision}`,
          inArray(productContentSyncIntents.status, ['pending', 'failed', 'in_progress'])
        )
      )
      .returning({ jobId: productContentSyncIntents.translationJobId });
    const jobIds = replaced.flatMap(row => (row.jobId ? [row.jobId] : []));
    if (jobIds.length)
      await tx
        .update(translationJobs)
        .set({ status: 'superseded', updatedAt: new Date() })
        .where(inArray(translationJobs.id, jobIds));
  }
};
@Service()
export class PostgresqlProductContentSync implements ProductContentSync {
  constructor(
    @Inject(DrizzleToken) private readonly db: Drizzle,
    @Inject(SearchableProductRepositoryToken) private readonly search: SearchableProductRepository,
    private readonly queue: ProductContentSyncQueueService
  ) {}

  async requestSearch(slug: string): Promise<ProductContentSyncStatus> {
    try {
      return await this.db.transaction(async tx => {
        const [owner] = await tx.select({ id: products.id }).from(products).where(eq(products.slug, slug));
        if (!owner) throw productNotFound();
        const product = await lockProductSource(tx, owner.id);
        if (!product.publishedAt)
          throw new GraphQLError('발행되지 않은 Product는 색인할 수 없습니다.', {
            extensions: { code: 'PRODUCT_NOT_PUBLISHED' },
          });
        const [intent] = await tx
          .insert(productContentSyncIntents)
          .values({ productId: product.id, sourceRevision: product.contentRevision, kind: 'search' })
          .onConflictDoUpdate({
            target: [
              productContentSyncIntents.productId,
              productContentSyncIntents.sourceRevision,
              productContentSyncIntents.kind,
            ],
            set: {
              status: 'pending',
              error: null,
              attemptCount: 0,
              leaseToken: null,
              leaseUntil: null,
              retryAfter: new Date(),
              dispatchAfter: new Date(),
              updatedAt: new Date(),
            },
            setWhere: inArray(productContentSyncIntents.status, ['completed', 'failed', 'superseded']),
          })
          .returning();
        if (intent) return status(intent);
        // Pending and claimed requests retain their budget, due time and attempt authority.
        const [existing] = await tx
          .select()
          .from(productContentSyncIntents)
          .where(
            and(
              eq(productContentSyncIntents.productId, product.id),
              eq(productContentSyncIntents.sourceRevision, product.contentRevision),
              eq(productContentSyncIntents.kind, 'search')
            )
          );
        if (!existing) throw new Error('Intent insert returned no row');
        return status(existing);
      });
    } catch (error) {
      if (error instanceof GraphQLError) throw error;
      if (error instanceof Error && 'code' in error && error.code === 'product/not-found') throw error;
      throw new GraphQLError('검색 동기화 의도를 기록하지 못했습니다.', {
        extensions: { code: 'CONTENT_SYNC_INTENT_WRITE_FAILED' },
      });
    }
  }

  async status(intentId: string): Promise<ProductContentSyncStatus | null> {
    const [intent] = await this.db
      .select()
      .from(productContentSyncIntents)
      .where(eq(productContentSyncIntents.id, intentId));
    if (!intent) return null;
    if (!intent.translationJobId) return status(intent);
    const [job] = await this.db.select().from(translationJobs).where(eq(translationJobs.id, intent.translationJobId));
    if (!job) throw new Error('CONTENT_SYNC_TRANSLATION_JOB_MISSING');
    return { ...status(intent), translationJobStatus: job.status, translationDispatchStatus: jobDispatchStatus(job) };
  }

  async latestStatus(slug: string): Promise<ProductContentSyncOverview> {
    return this.db.transaction(async tx => {
      const [owner] = await tx.select({ id: products.id }).from(products).where(eq(products.slug, slug));
      if (!owner) throw productNotFound();
      const product = await lockProductSource(tx, owner.id);
      const intents = await tx
        .selectDistinctOn([productContentSyncIntents.kind])
        .from(productContentSyncIntents)
        .where(eq(productContentSyncIntents.productId, product.id))
        .orderBy(asc(productContentSyncIntents.kind), desc(productContentSyncIntents.sourceRevision));
      const search = intents.find(intent => intent.kind === 'search');
      const translation = intents.find(intent => intent.kind === 'translation');
      const [job] = translation?.translationJobId
        ? await tx.select().from(translationJobs).where(eq(translationJobs.id, translation.translationJobId))
        : [];
      if (translation && !job) throw new Error('CONTENT_SYNC_TRANSLATION_JOB_MISSING');
      return {
        productId: product.id,
        sourceRevision: product.contentRevision.toString(),
        searchStatus: search?.status ?? 'not_required',
        translationDispatchStatus: translation
          ? translation.status === 'superseded'
            ? 'superseded'
            : 'registered'
          : 'not_required',
        ...(search ? { searchIntent: status(search) } : {}),
        ...(translation ? { translationIntent: status(translation) } : {}),
        ...(job
          ? {
              translationJobId: job.id,
              translationJobStatus: job.status,
              translationJobDispatchStatus: jobDispatchStatus(job),
            }
          : {}),
      };
    });
  }

  async retry(slug: string): Promise<ProductContentSyncOverview> {
    await this.db.transaction(async tx => {
      const [owner] = await tx.select({ id: products.id }).from(products).where(eq(products.slug, slug));
      if (!owner) throw productNotFound();
      await lockProductSource(tx, owner.id);
      const intents = await tx
        .selectDistinctOn([productContentSyncIntents.kind])
        .from(productContentSyncIntents)
        .where(eq(productContentSyncIntents.productId, owner.id))
        .orderBy(asc(productContentSyncIntents.kind), desc(productContentSyncIntents.sourceRevision));
      let retried = false;
      for (const kind of ['search', 'translation'] as const) {
        const intent = intents.find(row => row.kind === kind);
        if (!intent || intent.status !== 'failed') continue;
        let translationJobId = intent.translationJobId;
        if (kind === 'translation') {
          if (!translationJobId) throw new Error('CONTENT_SYNC_TRANSLATION_JOB_MISSING');
          const [job] = await tx
            .select()
            .from(translationJobs)
            .where(eq(translationJobs.id, translationJobId))
            .for('update');
          if (!job) throw new Error('CONTENT_SYNC_TRANSLATION_JOB_MISSING');
          if (job.status !== 'failed' && job.status !== 'superseded') continue;
          const [retry] = await tx
            .insert(translationJobs)
            .values({
              entityType: job.entityType,
              entityId: job.entityId,
              locale: job.locale,
              fields: job.fields,
              retryOfJobId: job.id,
              idempotencyKey: `retry:${job.id}:${randomUUID()}`,
              status: 'pending',
            })
            .returning();
          if (!retry) throw new Error('Translation retry registration failed');
          translationJobId = retry.id;
        }
        await tx
          .update(productContentSyncIntents)
          .set({
            status: 'pending',
            error: null,
            attemptCount: 0,
            translationJobId,
            leaseToken: null,
            leaseUntil: null,
            retryAfter: new Date(),
            dispatchAfter: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(productContentSyncIntents.id, intent.id));
        retried = true;
      }
      if (!retried)
        throw new GraphQLError('최신 동기화 의도 중 실패한 작업이 없습니다.', {
          extensions: { code: 'CONTENT_SYNC_NOT_RETRYABLE' },
        });
    });
    return this.latestStatus(slug);
  }

  async reconcileTranslation(jobId: string): Promise<void> {
    await this.db.transaction(async tx => {
      const [owner] = await tx
        .select({ productId: productContentSyncIntents.productId })
        .from(productContentSyncIntents)
        .where(eq(productContentSyncIntents.translationJobId, jobId));
      if (!owner) return;
      await lockProductSource(tx, owner.productId);
      const [intent] = await tx
        .select()
        .from(productContentSyncIntents)
        .where(eq(productContentSyncIntents.translationJobId, jobId))
        .for('update');
      if (!intent || intent.status === 'superseded' || intent.status === 'completed') return;
      const [job] = await tx.select().from(translationJobs).where(eq(translationJobs.id, jobId)).for('update');
      if (!job) throw new Error('CONTENT_SYNC_TRANSLATION_JOB_MISSING');
      const retryable = job.status === 'failed' || job.status === 'superseded';
      const state =
        job.status === 'completed'
          ? 'completed'
          : job.status === 'in_progress'
            ? 'in_progress'
            : retryable
              ? 'failed'
              : 'pending';
      await tx
        .update(productContentSyncIntents)
        .set({
          status: state,
          attemptCount: job.attemptCount,
          error: job.error,
          retryAfter: new Date(Date.now() + 60_000),
          updatedAt: new Date(),
        })
        .where(eq(productContentSyncIntents.id, intent.id));
    });
  }

  async dispatch(limit = 50): Promise<{ recovered: number; queued: number }> {
    const now = new Date();
    const exhausted = await this.db
      .update(productContentSyncIntents)
      .set({ status: 'failed', error: 'SEARCH_ATTEMPTS_EXHAUSTED', leaseToken: null, leaseUntil: null, updatedAt: now })
      .where(
        and(
          eq(productContentSyncIntents.kind, 'search'),
          eq(productContentSyncIntents.status, 'in_progress'),
          sql`${productContentSyncIntents.attemptCount} >= ${JOB_MAX_ATTEMPTS}`,
          or(isNull(productContentSyncIntents.leaseUntil), lte(productContentSyncIntents.leaseUntil, now))
        )
      )
      .returning({ id: productContentSyncIntents.id });
    // A failed/stale-source translation remains recoverable without another canonical edit.
    const translations = await this.db
      .select({ intent: productContentSyncIntents, job: translationJobs })
      .from(productContentSyncIntents)
      .innerJoin(translationJobs, eq(productContentSyncIntents.translationJobId, translationJobs.id))
      .where(
        and(
          eq(productContentSyncIntents.kind, 'translation'),
          inArray(productContentSyncIntents.status, ['pending', 'in_progress']),
          lte(productContentSyncIntents.retryAfter, now)
        )
      )
      .limit(limit);
    for (const { job } of translations) await this.reconcileTranslation(job.id);
    const candidates = await this.db
      .select()
      .from(productContentSyncIntents)
      .where(
        and(
          eq(productContentSyncIntents.kind, 'search'),
          lte(productContentSyncIntents.retryAfter, now),
          lte(productContentSyncIntents.dispatchAfter, now),
          lt(productContentSyncIntents.attemptCount, JOB_MAX_ATTEMPTS),
          or(
            inArray(productContentSyncIntents.status, ['pending', 'failed']),
            and(
              eq(productContentSyncIntents.status, 'in_progress'),
              or(isNull(productContentSyncIntents.leaseUntil), lte(productContentSyncIntents.leaseUntil, now))
            )
          )
        )
      )
      .orderBy(asc(productContentSyncIntents.createdAt))
      .limit(limit);
    let queued = 0;
    for (const intent of candidates) {
      const [reserved] = await this.db
        .update(productContentSyncIntents)
        .set({ dispatchAfter: new Date(now.getTime() + 60_000) })
        .where(
          and(
            eq(productContentSyncIntents.id, intent.id),
            lte(productContentSyncIntents.dispatchAfter, now),
            inArray(productContentSyncIntents.status, ['pending', 'failed', 'in_progress'])
          )
        )
        .returning({ id: productContentSyncIntents.id });
      if (!reserved) continue;
      try {
        if (await this.queue.sendIntent(intent.id)) queued++;
      } catch (error) {
        await this.db
          .update(productContentSyncIntents)
          .set({ error: 'CONTENT_SYNC_QUEUE_FAILED', updatedAt: now })
          .where(eq(productContentSyncIntents.id, intent.id));
      }
    }
    return { recovered: candidates.length + translations.length + exhausted.length, queued };
  }

  async executeSearch(intentId: string): Promise<void> {
    const token = randomUUID();
    const claimed = await this.db.transaction(async tx => {
      const [owner] = await tx
        .select({ productId: productContentSyncIntents.productId })
        .from(productContentSyncIntents)
        .where(eq(productContentSyncIntents.id, intentId));
      if (!owner) throw new Error('CONTENT_SYNC_INTENT_NOT_FOUND');
      const source = await readProductDescriptionEvidenceSources(tx, owner.productId);
      const [intent] = await tx
        .select()
        .from(productContentSyncIntents)
        .where(eq(productContentSyncIntents.id, intentId))
        .for('update');
      if (!intent || intent.kind !== 'search') throw new Error('CONTENT_SYNC_QUEUE_IDENTITY_INVALID');
      if (
        intent.status === 'completed' ||
        intent.status === 'superseded' ||
        (intent.status === 'in_progress' && intent.leaseUntil && intent.leaseUntil > new Date())
      )
        return null;
      if (intent.attemptCount >= JOB_MAX_ATTEMPTS) {
        if (intent.status === 'in_progress')
          await tx
            .update(productContentSyncIntents)
            .set({
              status: 'failed',
              error: 'SEARCH_ATTEMPTS_EXHAUSTED',
              leaseToken: null,
              leaseUntil: null,
              updatedAt: new Date(),
            })
            .where(eq(productContentSyncIntents.id, intent.id));
        return null;
      }
      if (intent.retryAfter > new Date()) return null;
      const [newer] = await tx
        .select({ id: productContentSyncIntents.id })
        .from(productContentSyncIntents)
        .where(
          and(
            eq(productContentSyncIntents.productId, intent.productId),
            eq(productContentSyncIntents.kind, 'search'),
            gt(productContentSyncIntents.sourceRevision, intent.sourceRevision)
          )
        )
        .limit(1);
      if (newer) {
        await tx
          .update(productContentSyncIntents)
          .set({ status: 'superseded', updatedAt: new Date() })
          .where(eq(productContentSyncIntents.id, intent.id));
        return null;
      }
      await tx
        .update(productContentSyncIntents)
        .set({
          status: 'in_progress',
          leaseToken: token,
          leaseUntil: new Date(Date.now() + 60_000),
          attemptCount: sql`${productContentSyncIntents.attemptCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(productContentSyncIntents.id, intent.id));
      return source;
    });
    if (!claimed) return;
    try {
      const product = claimed.product;
      const indexed = await this.search.index(
        product.id,
        new SearchableProduct({
          id: product.id,
          name: product.name,
          slug: product.slug,
          summary: product.summary,
          description: product.description,
          tags: claimed.tags,
          category: product.categoryIds[0] ?? '',
          createdAt: product.createdAt,
          publishedAt: product.publishedAt ?? undefined,
          sourceRevision: product.contentRevision.toString(),
        })
      );
      if (!indexed) throw new Error('SEARCH_WRITE_FAILED');
      await this.finishSearch(intentId, token, 'completed', null);
    } catch (error) {
      const code = error instanceof Error && 'code' in error ? String(error.code) : 'SEARCH_WRITE_FAILED';
      await this.finishSearch(intentId, token, 'failed', code);
    }
  }

  private async finishSearch(intentId: string, token: string, state: 'completed' | 'failed', error: string | null) {
    await this.db
      .update(productContentSyncIntents)
      .set({ status: state, error, updatedAt: new Date(), retryAfter: new Date(Date.now() + 60_000) })
      .where(
        and(
          eq(productContentSyncIntents.id, intentId),
          eq(productContentSyncIntents.status, 'in_progress'),
          eq(productContentSyncIntents.leaseToken, token),
          gt(productContentSyncIntents.leaseUntil, new Date())
        )
      );
  }
}
