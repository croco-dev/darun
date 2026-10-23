import { GetProduct } from '@darun/products-domain';
import {
  computeSourceHash,
  translationFields,
  TranslationJobRepositoryToken,
  TranslationProviderToken,
  TranslationSourceStoreToken,
  type TranslationEntityType,
  type TranslationJobEntity,
  type TranslationJobRepository,
  type TranslationJobStatus,
  type TranslationProvider,
  type TranslationSourceSnapshot,
  type TranslationSourceStore,
  type UpsertTranslationParams,
} from '@darun/translation-domain';
import { JOB_LEASE_MS, JOB_COMMIT_MARGIN_MS, isRetryableError, withAbortableStage } from '@darun/utils-llm';
import { Inject, Service } from 'typedi';
import { randomUUID } from 'node:crypto';
import { TranslationQueueService, type TranslationQueuePayload } from './TranslationQueueService';

export type { TranslationEntityType } from '@darun/translation-domain';
export const TRANSLATION_LEASE_MS = JOB_LEASE_MS;
export const TRANSLATION_STAGE_BUDGET_MS = 270_000 - JOB_COMMIT_MARGIN_MS;

@Service()
export class TranslationJobService {
  constructor(
    private readonly getProductUseCase: GetProduct,
    @Inject(TranslationProviderToken) private readonly provider: TranslationProvider,
    @Inject(TranslationJobRepositoryToken) private readonly repository: TranslationJobRepository,
    @Inject(TranslationSourceStoreToken) private readonly sourceStore: TranslationSourceStore,
    private readonly queue: TranslationQueueService
  ) {}

  async requestTranslationJob(entityType: TranslationEntityType, entityId: string, fields: string[]) {
    const normalizedFields = translationFields({ entityType, entityId, fields });
    // Read failures and invalid fields cannot register work that pretends to be valid.
    await this.sourceStore.read({ entityType, entityId, fields: normalizedFields });
    const job = await this.repository.createJob({
      entityType,
      entityId,
      locale: 'en',
      fields: normalizedFields,
      status: 'pending',
      message: '번역 작업이 대기열에 등록되었습니다.',
    });
    const queued = await this.sendToQueue({ jobId: job.id, entityType, entityId });
    return { ...job, queued };
  }

  async requestProductTranslationJob(identifier: { id?: string; slug?: string } | string) {
    const product = await this.getProductUseCase.execute(
      typeof identifier === 'string' ? { id: identifier } : identifier
    );
    if (!product) throw new Error('Product가 존재하지 않습니다.');
    const fields = ['name', 'summary', 'description', 'features'];
    const active = await this.repository.findActiveJob?.({ entityType: 'Product', entityId: product.id, locale: 'en' });
    if (
      active &&
      JSON.stringify(
        translationFields({ entityType: 'Product', entityId: product.id, fields: active.fields ?? null })
      ) === JSON.stringify(fields)
    ) {
      const queued =
        active.status === 'in_progress' ||
        (await this.sendToQueue({ jobId: active.id, entityType: 'Product', entityId: product.id }));
      return { ...active, queued };
    }
    return this.requestTranslationJob('Product', product.id, fields);
  }

  async getJob(id: string): Promise<TranslationJobEntity | null> {
    return this.repository.findJobById(id);
  }

  async getJobs(options?: {
    status?: TranslationJobStatus;
    limit?: number;
    offset?: number;
  }): Promise<TranslationJobEntity[]> {
    return this.repository.findJobs(options);
  }

  async retryProductTranslationJob(jobId: string) {
    const job = await this.repository.findJobById(jobId);
    if (!job) throw new Error(`존재하지 않는 번역 작업입니다: ${jobId}`);
    if (job.status !== 'failed' && job.status !== 'pending')
      throw new Error(`재시도할 수 없는 번역 작업 상태입니다: ${job.status}`);
    const entityType = this.entityType(job.entityType);
    translationFields({ entityType, entityId: job.entityId, fields: job.fields ?? null });
    // 실패한 job의 새 logical retry 등록과 최신 intent 연결은 앱 adapter가 한 commit에 저장한다.
    const retry = job.status === 'failed' ? await this.sourceStore.createRetryJob(job.id) : job;
    const queued = await this.sendToQueue({ jobId: retry.id, entityType, entityId: retry.entityId });
    return { ...retry, queued };
  }

  /** Queue identity is checked against the persisted job; fields never come from an SQS message. */
  async executeTranslationJob(
    jobId: string,
    expected: { entityType: string; entityId: string },
    options?: { leaseToken?: string; signal?: AbortSignal; stageBudgetMs?: number; deadline?: Date }
  ) {
    const job = await this.repository.findJobById(jobId);
    if (!job || job.entityType !== expected.entityType || job.entityId !== expected.entityId)
      throw new Error('Translation queue identity mismatch');
    const entityType = this.entityType(job.entityType);
    const fields = job.fields ?? null;
    translationFields({ entityType, entityId: job.entityId, fields });
    const leaseToken = options?.leaseToken ?? randomUUID();
    const claimed = await this.repository.claimJobLease({
      jobId,
      leaseToken,
      leaseUntil: new Date(Date.now() + TRANSLATION_LEASE_MS),
    });
    if (!claimed) return;
    let stageSignal: AbortSignal | undefined;
    try {
      await withAbortableStage(
        async signal => {
          stageSignal = signal;
          const snapshot = await this.sourceStore.read({ entityType, entityId: job.entityId, fields });
          const result = await this.translateSnapshot(snapshot, signal);
          // Deadline aborts cannot commit even if a provider ignores its AbortSignal.
          signal.throwIfAborted();
          await this.sourceStore.commit({
            jobId,
            leaseToken,
            snapshot,
            ...result,
            deadline: options?.deadline,
            signal,
          });
        },
        {
          budgetMs: options?.stageBudgetMs ?? TRANSLATION_STAGE_BUDGET_MS,
          signal: options?.signal,
          message: '번역 작업 실행 시간이 초과되었습니다.',
        }
      );
    } catch (error) {
      if (stageSignal?.aborted || options?.signal?.aborted || (error instanceof Error && error.name === 'AbortError'))
        return;
      const message = error instanceof Error ? error.message : '알 수 없는 오류';
      if (isRetryableError(error)) await this.repository.retryJobLease(jobId, leaseToken, message);
      else
        await this.repository.completeJobLease(jobId, leaseToken, 'failed', {
          message: '번역에 실패했습니다.',
          error: message,
        });
    }
  }

  async executeProductTranslationJob(
    jobId: string,
    productId: string,
    options?: { leaseToken?: string; signal?: AbortSignal; stageBudgetMs?: number }
  ) {
    await this.executeTranslationJob(jobId, { entityType: 'Product', entityId: productId }, options);
  }

  private async translateSnapshot(snapshot: TranslationSourceSnapshot, signal: AbortSignal) {
    const rows: UpsertTranslationParams[] = [];
    let model = '';
    let promptVersion = '';
    const fields = translationFields(snapshot);
    if (snapshot.entityType === 'Product' && fields.includes('features')) {
      if (!snapshot.product) throw new Error('Product bundle source context is missing');
      const productValues = snapshot.product;
      const featureIds = [
        ...new Set(snapshot.values.filter(value => value.entityType === 'ProductFeature').map(value => value.entityId)),
      ];
      const features = featureIds.map(id => ({
        id,
        name: snapshot.values.find(value => value.entityId === id && value.field === 'name')!.value,
        summary: snapshot.values.find(value => value.entityId === id && value.field === 'summary')!.value,
      }));
      const result = await this.provider.translateProductBundle({
        productId: snapshot.entityId,
        name: productValues['name']!,
        summary: productValues['summary']!,
        description: productValues['description']!,
        features,
        signal,
      });
      model = result.model;
      promptVersion = result.promptVersion;
      for (const source of snapshot.values) {
        const feature = result.features.find(feature => feature.id === source.entityId);
        const value =
          source.entityType === 'Product'
            ? result.product[source.field as 'name' | 'summary' | 'description']
            : feature?.[source.field as 'name' | 'summary'];
        if (typeof value !== 'string') throw new Error('Incomplete provider translation result');
        rows.push({
          ...source,
          locale: 'en',
          value,
          sourceHash: computeSourceHash(source.value),
          model,
          promptVersion,
        });
      }
    } else {
      for (const source of snapshot.values) {
        const result = await this.provider.translateSingle({
          entityType: source.entityType,
          entityId: source.entityId,
          field: source.field,
          koreanText: source.value,
          mode:
            source.entityType === 'Magazine' || source.field === 'description'
              ? 'editorial'
              : source.field === 'name'
                ? 'label'
                : 'product_copy',
          isHtml: source.field === 'description' || source.field === 'content',
          signal,
        });
        if (model && (model !== result.model || promptVersion !== result.promptVersion))
          throw new Error('Translation provenance changed within a job');
        model = result.model;
        promptVersion = result.promptVersion;
        rows.push({
          ...source,
          locale: 'en',
          value: result.translatedText,
          sourceHash: computeSourceHash(source.value),
          model,
          promptVersion,
        });
      }
    }
    if (!model || !promptVersion) throw new Error('Missing translation provenance');
    return { rows, model, promptVersion };
  }

  async recoverInterruptedJobs(input?: { now?: Date; limit?: number }) {
    const jobs = await this.repository.findRecoverableJobs({
      now: input?.now ?? new Date(),
      limit: input?.limit ?? 25,
    });
    let queued = 0;
    for (const job of jobs) {
      if (
        await this.sendToQueue({ jobId: job.id, entityType: this.entityType(job.entityType), entityId: job.entityId })
      )
        queued++;
    }
    return { recovered: jobs.length, queued };
  }

  private entityType(value: string): TranslationEntityType {
    if (value !== 'Product' && value !== 'Magazine' && value !== 'ProductFeature')
      throw new Error(`Unsupported translation entity: ${value}`);
    return value;
  }

  private async sendToQueue(payload: TranslationQueuePayload): Promise<boolean> {
    try {
      return await this.queue.sendJob(payload);
    } catch (error) {
      console.warn('[TranslationJobService] Queue send failed; pending job remains recoverable:', error);
      return false;
    }
  }
}
