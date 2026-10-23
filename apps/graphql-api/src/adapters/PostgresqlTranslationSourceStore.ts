import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { PostgresqlTranslationJobRepository } from '@darun/translation-datasource';
import {
  computeSourceHash,
  translationFields,
  TranslationSourceStoreToken,
  type TranslationEntityType,
  type TranslationJobEntity,
  type TranslationSourceRequest,
  type TranslationSourceSnapshot,
  type TranslationSourceStore,
  type TranslationCommit,
  type TranslationCommitResult,
} from '@darun/translation-domain';
import { JOB_COMMIT_MARGIN_MS } from '@darun/utils-llm';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { randomUUID } from 'node:crypto';
import { magazines } from '../../../../libs/magazines/datasource/src/entities/MagazineSchema';
import { productContentSyncIntents } from '../../../../libs/products/datasource/src/entities/ProductContentSyncIntentSchema';
import { productFeatures } from '../../../../libs/products/datasource/src/entities/ProductFeaturesSchema';
import { lockProductSource } from '../../../../libs/products/datasource/src/repositories/productSourceMutex';
import { translationJobs } from '../../../../libs/translation/datasource/src/entities/TranslationJobSchema';
import { translations } from '../../../../libs/translation/datasource/src/entities/TranslationSchema';

type Tx = Parameters<Parameters<Drizzle['transaction']>[0]>[0];

/** App-owned composition: source mutex, fresh source, attempt authority and payload share one commit. */
@Service(TranslationSourceStoreToken)
export class PostgresqlTranslationSourceStore implements TranslationSourceStore {
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

  read(request: TranslationSourceRequest): Promise<TranslationSourceSnapshot> {
    return this.db.transaction(tx => this.readLocked(tx, request));
  }

  /**
   * 실패한 job의 새 logical retry 등록과 최신 translation intent 포인터 갱신을
   * Product-first 잠금 안 같은 commit에 저장한다. 최신 intent가 previousJob을
   * 가리키지 않으면 포인터는 옮기지 않고 retry만 등록한다.
   */
  async createRetryJob(previousJobId: string): Promise<TranslationJobEntity> {
    return this.db.transaction(async tx => {
      const [previous] = await tx.select().from(translationJobs).where(eq(translationJobs.id, previousJobId));
      if (!previous) throw new Error('CONTENT_SYNC_RETRY_IDENTITY_INVALID');
      const fields = translationFields({
        entityType: previous.entityType as TranslationEntityType,
        entityId: previous.entityId,
        fields: previous.fields ?? null,
      });
      const [owner] = await tx
        .select({ productId: productContentSyncIntents.productId })
        .from(productContentSyncIntents)
        .where(eq(productContentSyncIntents.translationJobId, previousJobId));
      let latest: typeof productContentSyncIntents.$inferSelect | undefined;
      if (owner) {
        await lockProductSource(tx, owner.productId);
        [latest] = await tx
          .select()
          .from(productContentSyncIntents)
          .where(
            and(
              eq(productContentSyncIntents.productId, owner.productId),
              eq(productContentSyncIntents.kind, 'translation')
            )
          )
          .orderBy(sql`${productContentSyncIntents.sourceRevision} desc`)
          .limit(1)
          .for('update');
      }
      const retry = await new PostgresqlTranslationJobRepository(tx).createJob({
        entityType: previous.entityType,
        entityId: previous.entityId,
        locale: previous.locale,
        fields,
        retryOfJobId: previous.id,
        idempotencyKey: `retry:${previous.id}:${randomUUID()}`,
        status: 'pending',
      });
      if (!latest || latest.translationJobId !== previousJobId || latest.status === 'superseded') return retry;
      if (retry.entityType !== 'Product' || retry.entityId !== latest.productId)
        throw new Error('CONTENT_SYNC_RETRY_IDENTITY_INVALID');
      await tx
        .update(productContentSyncIntents)
        .set({ translationJobId: retry.id, status: 'pending', error: null, updatedAt: new Date() })
        .where(eq(productContentSyncIntents.id, latest.id));
      return retry;
    });
  }

  private async readLocked(tx: Tx, request: TranslationSourceRequest): Promise<TranslationSourceSnapshot> {
    const fields = translationFields(request);
    const values: TranslationSourceSnapshot['values'] = [];
    let productContext: TranslationSourceSnapshot['product'];
    const append = (
      entityType: TranslationSourceRequest['entityType'],
      entityId: string,
      field: string,
      value: string | null
    ) => {
      values.push({ entityType, entityId, field, value: value ?? '' });
    };
    if (request.entityType === 'Product') {
      const product = await lockProductSource(tx, request.entityId);
      if (fields.includes('features'))
        productContext = { name: product.name, summary: product.summary, description: product.description ?? '' };
      for (const field of fields) {
        if (field === 'features') {
          const features = await tx
            .select()
            .from(productFeatures)
            .where(eq(productFeatures.productId, product.id))
            .orderBy(asc(productFeatures.id));
          for (const feature of features) {
            append('ProductFeature', feature.id, 'name', feature.name);
            append('ProductFeature', feature.id, 'summary', feature.summary);
          }
        } else {
          if (field !== 'name' && field !== 'summary' && field !== 'description')
            throw new Error('Invalid Product field');
          append('Product', product.id, field, product[field]);
        }
      }
    } else if (request.entityType === 'ProductFeature') {
      // Discover the owner without locking the child: every child writer uses Product-first order.
      const [owner] = await tx
        .select({ productId: productFeatures.productId })
        .from(productFeatures)
        .where(eq(productFeatures.id, request.entityId));
      if (!owner) throw new Error('ProductFeature source not found');
      await lockProductSource(tx, owner.productId);
      const [feature] = await tx.select().from(productFeatures).where(eq(productFeatures.id, request.entityId));
      if (!feature || feature.productId !== owner.productId) throw new Error('ProductFeature source changed owner');
      for (const field of fields) {
        if (field !== 'name' && field !== 'summary') throw new Error('Invalid ProductFeature field');
        append('ProductFeature', feature.id, field, feature[field]);
      }
    } else {
      const [magazine] = await tx.select().from(magazines).where(eq(magazines.id, request.entityId)).for('update');
      if (!magazine) throw new Error('Magazine source not found');
      for (const field of fields) {
        if (field !== 'title' && field !== 'summary' && field !== 'content') throw new Error('Invalid Magazine field');
        append('Magazine', magazine.id, field, magazine[field]);
      }
    }
    values.sort((a, b) =>
      JSON.stringify([a.entityType, a.entityId, a.field]).localeCompare(
        JSON.stringify([b.entityType, b.entityId, b.field])
      )
    );
    return {
      ...request,
      ...(productContext ? { product: productContext } : {}),
      sourceHash: computeSourceHash(JSON.stringify({ values, product: productContext })),
      values,
    };
  }

  commit(input: TranslationCommit): Promise<TranslationCommitResult> {
    return this.db.transaction(async tx => {
      await tx.execute(sql`set local statement_timeout = '15s'`);
      // Lock source before job, matching Apply and all Product source writers.
      const current = await this.readLocked(tx, input.snapshot);
      const [job] = await tx.select().from(translationJobs).where(eq(translationJobs.id, input.jobId)).for('update');
      if (
        !job ||
        job.status !== 'in_progress' ||
        job.leaseToken !== input.leaseToken ||
        !job.leaseUntil ||
        job.leaseUntil <= new Date(Date.now() + JOB_COMMIT_MARGIN_MS) ||
        input.signal?.aborted ||
        (input.deadline && input.deadline.getTime() - Date.now() < JOB_COMMIT_MARGIN_MS)
      )
        return 'lease_lost';
      if (
        job.entityType !== current.entityType ||
        job.entityId !== current.entityId ||
        job.locale !== 'en' ||
        JSON.stringify(translationFields({ ...current, fields: job.fields })) !==
          JSON.stringify(translationFields(current))
      ) {
        throw new Error('Translation job and source snapshot disagree');
      }
      if (current.sourceHash !== input.snapshot.sourceHash) {
        await tx
          .update(translationJobs)
          .set({ status: 'superseded', message: '원문이 변경되어 번역 결과를 폐기했습니다.', updatedAt: new Date() })
          .where(eq(translationJobs.id, job.id));
        return 'superseded';
      }
      if (!input.model.trim() || !input.promptVersion.trim() || input.rows.length !== current.values.length) {
        throw new Error('Incomplete translation commit');
      }
      const key = (row: { entityType: string; entityId: string; field: string }) =>
        JSON.stringify([row.entityType, row.entityId, row.field]);
      const rows = new Map(input.rows.map(row => [key(row), row]));
      if (rows.size !== input.rows.length) throw new Error('Duplicate translation commit row');
      const writes = current.values.map(source => {
        const row = rows.get(key(source));
        if (
          !row ||
          row.locale !== 'en' ||
          typeof row.value !== 'string' ||
          (source.value.trim() ? !row.value.trim() : row.value !== '')
        )
          throw new Error('Incomplete translation value');
        return {
          ...row,
          sourceHash: computeSourceHash(source.value),
          model: input.model,
          promptVersion: input.promptVersion,
        };
      });
      if (writes.length)
        await tx
          .insert(translations)
          .values(writes)
          .onConflictDoUpdate({
            target: [translations.entityType, translations.entityId, translations.locale, translations.field],
            set: {
              value: sql`excluded.value`,
              sourceHash: sql`excluded.source_hash`,
              model: sql`excluded.model`,
              promptVersion: sql`excluded.prompt_version`,
              updatedAt: new Date(),
            },
          });
      const completed = await tx
        .update(translationJobs)
        .set({
          status: 'completed',
          sourceHash: current.sourceHash,
          model: input.model,
          promptVersion: input.promptVersion,
          message: '영문 번역이 완료되었습니다.',
          error: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(translationJobs.id, job.id),
            eq(translationJobs.leaseToken, input.leaseToken),
            eq(translationJobs.status, 'in_progress'),
            sql`${translationJobs.leaseUntil} > clock_timestamp()`,
            input.deadline ? sql`clock_timestamp() < ${input.deadline.toISOString()}::timestamptz` : undefined
          )
        )
        .returning({ id: translationJobs.id });
      if (!completed.length || input.signal?.aborted) throw new Error('Translation attempt expired during commit');
      await tx
        .update(productContentSyncIntents)
        .set({ status: 'completed', attemptCount: job.attemptCount, error: null, updatedAt: new Date() })
        .where(
          and(
            eq(productContentSyncIntents.translationJobId, job.id),
            inArray(productContentSyncIntents.status, ['pending', 'in_progress', 'failed'])
          )
        );
      return 'completed';
    });
  }
}
