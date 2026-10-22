import { GetMagazine, Magazine } from '@darun/magazines-domain';
import { GetProduct, GetProductFeature, GetProductFeatures, Product, ProductFeature } from '@darun/products-domain';
import {
  computeSourceHash,
  validateProductBundleTranslation,
  type ProductBundleTranslationRequest,
  type ProductBundleTranslationResult,
  type SingleTranslationRequest,
  type SingleTranslationResult,
  type TranslationJobEntity,
  type TranslationJobRepository,
  TranslationJobRepositoryToken,
  type TranslationJobStatus,
  type TranslationMode,
  type TranslationProvider,
  TranslationProviderToken,
  TranslationService,
  type UpsertTranslationParams,
} from '@darun/translation-domain';
import { LlmClient, RetryableError } from '@darun/utils-llm';
import { Inject, Service } from 'typedi';
import { randomUUID } from 'node:crypto';
import { TranslationQueueService } from './TranslationQueueService';

export const TRANSLATION_LEASE_MS = 5 * 60 * 1000;
export const TRANSLATION_STAGE_BUDGET_MS = 4 * 60 * 1000;

function isAbortError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === 'AbortError' || error.message.includes('중단');
  }
  return false;
}

function withWorkerDeadline<T>(
  run: (signal: AbortSignal) => Promise<T>,
  deadlineMs: number,
  parentSignal?: AbortSignal
): Promise<T> {
  const controller = new AbortController();
  if (parentSignal?.aborted) {
    controller.abort();
  }
  const onParentAbort = () => controller.abort();
  if (parentSignal) {
    parentSignal.addEventListener('abort', onParentAbort, { once: true });
  }
  const timeout = setTimeout(() => controller.abort(), deadlineMs);
  const attempt: Promise<T> = run(controller.signal);
  attempt.catch(() => {});
  const cleanup = () => {
    clearTimeout(timeout);
    parentSignal?.removeEventListener('abort', onParentAbort);
  };
  return Promise.race([
    attempt.finally(cleanup),
    new Promise<never>((_, reject) => {
      controller.signal.addEventListener(
        'abort',
        () => {
          cleanup();
          const aborted = new Error('작업이 중단되었습니다.');
          aborted.name = 'AbortError';
          reject(aborted);
        },
        { once: true }
      );
    }),
  ]);
}

function validateBundleRowsForCommit(
  requestedFeatures: Array<{ id: string }>,
  bundleResult: ProductBundleTranslationResult
): void {
  const requestedIds = requestedFeatures.map(feature => feature.id);
  const requestedIdSet = new Set(requestedIds);
  if (requestedIdSet.size !== requestedIds.length) {
    throw new Error('번역 커밋 요청에 중복된 기능 ID가 포함되었습니다.');
  }
  const returnedIds = Array.isArray(bundleResult.features) ? bundleResult.features.map(feature => feature.id) : [];
  const returnedIdSet = new Set(returnedIds);
  if (returnedIdSet.size !== returnedIds.length) {
    throw new Error('번역 결과에 중복된 기능 ID가 포함되었습니다.');
  }
  for (const id of returnedIds) {
    if (!id || !requestedIdSet.has(id)) {
      throw new Error(`번역 결과에 알 수 없는 기능 ID(${id || '없음'})가 포함되었습니다.`);
    }
  }
  for (const id of requestedIds) {
    if (!returnedIdSet.has(id)) {
      throw new Error(`번역 결과에 요청된 기능 ID(${id})가 누락되었습니다.`);
    }
  }
}

export type TranslationEntityType = 'Product' | 'Magazine' | 'ProductFeature';

type TranslatableFieldMetadata = {
  property: string;
  mode: TranslationMode;
  isHtml?: boolean;
};

export const TRANSLATABLE_FIELD_METADATA: Record<
  TranslationEntityType,
  { fields: Record<string, TranslatableFieldMetadata> }
> = {
  Product: {
    fields: {
      name: { property: 'name', mode: 'label' },
      summary: { property: 'summary', mode: 'product_copy' },
      description: { property: 'description', mode: 'editorial', isHtml: true },
    },
  },
  Magazine: {
    fields: {
      title: { property: 'title', mode: 'label' },
      summary: { property: 'summary', mode: 'product_copy' },
      content: { property: 'content', mode: 'editorial', isHtml: true },
    },
  },
  ProductFeature: {
    fields: {
      name: { property: 'name', mode: 'label' },
      summary: { property: 'summary', mode: 'product_copy' },
    },
  },
};

interface MinimalLlmClient {
  completion: (
    messages: Array<{ role: string; content: string }>,
    options?: Record<string, unknown>
  ) => Promise<{ content?: string }>;
}

class LlmClientTranslationProviderAdapter implements TranslationProvider {
  constructor(private readonly client: MinimalLlmClient) {}

  async translateSingle(request: SingleTranslationRequest): Promise<SingleTranslationResult> {
    const isHtml = request.isHtml;
    const res = await this.client.completion([
      { role: 'system', content: 'You are a translator.' },
      {
        role: 'user',
        content: isHtml
          ? `Translate the following Korean HTML text to English, preserving all HTML tags: ${request.koreanText}`
          : `Translate the following Korean text to English: ${request.koreanText}`,
      },
    ]);
    const translatedText = res.content?.trim() ?? '';
    if (!translatedText) {
      throw new Error('LLM 번역 결과가 비어 있습니다.');
    }
    return {
      translatedText,
      sourceHash: computeSourceHash(request.koreanText),
      model: 'llm-client',
      promptVersion: 'v1.0.0',
    };
  }

  async translateProductBundle(request: ProductBundleTranslationRequest): Promise<ProductBundleTranslationResult> {
    const inputPayload = {
      name: request.name,
      summary: request.summary,
      description: request.description,
      features: request.features,
    };
    const prompt = [
      '다음 제품 정보와 주요 기능 목록을 영어로 번역해주세요.',
      '반드시 아래와 같은 JSON 형식으로만 응답하고, 마크다운 코드블록이나 다른 설명은 일절 포함하지 마세요.',
      '',
      'JSON 응답 포맷:',
      '{',
      '  "name": "영문 제품명",',
      '  "summary": "영문 한 줄 요약",',
      '  "description": "영문 본문 설명 (HTML 태그 보존)",',
      '  "features": [',
      '    { "id": "기능ID", "name": "영문 기능명", "summary": "영문 기능 설명" }',
      '  ]',
      '}',
      '',
      '번역할 원본 데이터 (JSON):',
      JSON.stringify(inputPayload, null, 2),
    ].join('\n');

    const res = await this.client.completion([
      { role: 'system', content: 'You are a translator.' },
      { role: 'user', content: prompt },
    ]);

    const content = res.content?.trim() ?? '';
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const target = jsonMatch ? jsonMatch[1].trim() : content;
    let parsed: unknown;
    try {
      parsed = JSON.parse(target);
    } catch {
      throw new Error('LLM 번역 응답 JSON 파싱에 실패했습니다.');
    }

    const validated = validateProductBundleTranslation({ features: request.features }, parsed);

    return {
      product: {
        name: validated.product.name,
        summary: validated.product.summary,
        description: validated.product.description,
        nameSourceHash: computeSourceHash(request.name),
        summarySourceHash: computeSourceHash(request.summary),
        descriptionSourceHash: computeSourceHash(request.description),
      },
      features: request.features.map(reqF => {
        const translated = validated.features.find(f => f.id === reqF.id);
        if (!translated) {
          throw new Error(`번역 결과에 요청된 기능 ID(${reqF.id})가 누락되었습니다.`);
        }
        return {
          id: reqF.id,
          name: translated.name,
          summary: translated.summary,
          nameSourceHash: computeSourceHash(reqF.name),
          summarySourceHash: computeSourceHash(reqF.summary),
        };
      }),
      model: 'llm-client',
      promptVersion: 'v1.0.0',
    };
  }
}

@Service()
export class TranslationJobService {
  private readonly translationProvider: TranslationProvider;

  constructor(
    private readonly getProductUseCase: GetProduct,
    private readonly getMagazineUseCase: GetMagazine,
    private readonly translationService: TranslationService,
    @Inject(TranslationProviderToken)
    translationProviderOrLlmClient: TranslationProvider | LlmClient,
    private readonly getProductFeatureUseCase?: GetProductFeature,
    private readonly getProductFeaturesUseCase?: GetProductFeatures,
    @Inject(TranslationJobRepositoryToken)
    private readonly translationJobRepository?: TranslationJobRepository,
    private readonly translationQueueService?: TranslationQueueService
  ) {
    if (
      translationProviderOrLlmClient &&
      (typeof (translationProviderOrLlmClient as TranslationProvider).translateProductBundle === 'function' ||
        typeof (translationProviderOrLlmClient as TranslationProvider).translateSingle === 'function')
    ) {
      this.translationProvider = translationProviderOrLlmClient as TranslationProvider;
    } else {
      this.translationProvider = new LlmClientTranslationProviderAdapter(
        translationProviderOrLlmClient as unknown as MinimalLlmClient
      );
    }
  }

  async translateProductWithFeatures(
    identifier: { id?: string; slug?: string } | string,
    jobId?: string,
    options?: { signal?: AbortSignal; leaseToken?: string | null }
  ): Promise<{ productId: string; model?: string; promptVersion?: string; stale?: boolean; leaseLost?: boolean }> {
    const query = typeof identifier === 'string' ? { id: identifier } : identifier;
    const product = await this.getProductUseCase.execute(query);
    if (!product) {
      throw new Error('Product가 존재하지 않습니다.');
    }

    const productId = product.id;

    let features: ProductFeature[] = [];
    let initialFeaturesLoaded = false;
    if (this.getProductFeaturesUseCase) {
      try {
        features = await this.getProductFeaturesUseCase.execute({ productId });
        initialFeaturesLoaded = true;
      } catch (error) {
        console.warn(`Failed to fetch features for product ${productId}:`, error);
      }
    }

    const startProductHash = {
      name: computeSourceHash(product.name),
      summary: computeSourceHash(product.summary),
      description: computeSourceHash(product.description || ''),
    };
    const startFeatureHashes = new Map(
      features.map(f => [
        f.id,
        {
          name: computeSourceHash(f.name),
          summary: computeSourceHash(f.summary || ''),
        },
      ])
    );

    let completedModel: string | undefined;
    let completedPromptVersion: string | undefined;

    try {
      const bundleResult = await this.translationProvider.translateProductBundle({
        productId,
        name: product.name,
        summary: product.summary,
        description: product.description || '',
        features: features.map(feature => ({
          id: feature.id,
          name: feature.name,
          summary: feature.summary || '',
        })),
        ...(options?.signal ? { signal: options.signal } : {}),
      });

      // Early discard avoids unnecessary source reads; commitTranslations owns the atomic fence.
      if (jobId && options?.leaseToken !== undefined && this.translationJobRepository) {
        const current = await this.translationJobRepository.findJobById(jobId);
        if (!current || current.leaseToken !== options.leaseToken) {
          console.warn(
            `[TranslationJobService] Lease lost for job ${jobId}; discarding translation result without writing rows.`
          );
          return { productId, leaseLost: true };
        }
        // stale로 이미 확정된 행은 이 attempt가 덮어쓰지 않는다.
        if (current.status === 'superseded' || current.status === 'completed' || current.status === 'failed') {
          console.warn(
            `[TranslationJobService] Job ${jobId} already terminal (${current.status}); discarding stale translation result.`
          );
          return { productId, stale: current.status === 'superseded', leaseLost: true };
        }
      }

      // Pre-write snapshot check: re-read source to prevent stale overwrite
      const currentProduct = await this.getProductUseCase.execute({ id: productId });
      if (!currentProduct) {
        throw new Error('Product가 번역 도중 삭제되었습니다.');
      }

      let isStale =
        computeSourceHash(currentProduct.name) !== startProductHash.name ||
        computeSourceHash(currentProduct.summary) !== startProductHash.summary ||
        computeSourceHash(currentProduct.description || '') !== startProductHash.description;

      let currentFeatures: ProductFeature[] | null = null;
      if (this.getProductFeaturesUseCase) {
        try {
          currentFeatures = await this.getProductFeaturesUseCase.execute({ productId });
        } catch (error) {
          // 기능 목록을 두 번 연속으로 읽지 못하면 소스 신선도를 확정할 수 없다.
          // 기존 영문 행을 유지한 채 인프라 실패로 재시도한다.
          // 조용한 stale 저장도, 섣부른 superseded 확정도 하지 않는다.
          throw new RetryableError(`기능 목록 재조회에 실패했습니다: ${productId}`, undefined, error);
        }
      }

      if (!isStale && currentFeatures !== null) {
        if (!initialFeaturesLoaded || currentFeatures.length !== features.length) {
          isStale = true;
        } else {
          for (const cf of currentFeatures) {
            const startH = startFeatureHashes.get(cf.id);
            if (!startH) {
              isStale = true;
              break;
            }
            if (computeSourceHash(cf.name) !== startH.name || computeSourceHash(cf.summary || '') !== startH.summary) {
              isStale = true;
              break;
            }
          }
        }
      }

      if (isStale) {
        console.warn(
          `[TranslationJobService] Source content changed during translation for product ${productId}. Skipping stale write.`
        );
        if (jobId && this.translationJobRepository) {
          if (
            options?.leaseToken !== undefined &&
            typeof this.translationJobRepository.completeJobLease === 'function'
          ) {
            await this.translationJobRepository.completeJobLease(jobId, options.leaseToken ?? '', 'superseded', {
              message: '원문이 번역 도중 수정되어 번역 결과가 폐기되었습니다.',
            });
          } else {
            await this.translationJobRepository.updateJobStatus(jobId, 'superseded', {
              message: '원문이 번역 도중 수정되어 번역 결과가 폐기되었습니다.',
            });
          }
        }
        return { productId, stale: true };
      }

      const rows: UpsertTranslationParams[] = [];

      // 쓰기 직전 외부 번들의 형식을 커밋 게이트에서 다시 검증한다.
      // 단일 검증자가 유일한 형식 판정자이며, 여기서는 현재 스냅샷의
      // 요청 ID 집합과 번들 ID 집합 일치·필수명 비어 있지 않음만 확인하고
      // 행을 쓰기 전 거부한다. 값 정규화는 이미 provider가 마쳤다.
      validateBundleRowsForCommit(
        features.map(feature => ({ id: feature.id })),
        bundleResult
      );

      // 요청된 모든 필드를 스냅샷하고 전체 유효할 때만 일괄 커밋한다.
      // name은 필수, summary/description과 feature summary는 빈 값도 합법이다.
      const productName = bundleResult.product.name;
      if (typeof productName !== 'string' || !productName.trim()) {
        throw new Error('번역 결과에 name이 누락되었거나 문자열이 아닙니다.');
      }
      rows.push({
        entityType: 'Product',
        entityId: productId,
        locale: 'en',
        field: 'name',
        value: productName,
        sourceHash: bundleResult.product.nameSourceHash,
        model: bundleResult.model,
        promptVersion: bundleResult.promptVersion,
      });

      rows.push({
        entityType: 'Product',
        entityId: productId,
        locale: 'en',
        field: 'summary',
        value: bundleResult.product.summary ?? '',
        sourceHash: bundleResult.product.summarySourceHash,
        model: bundleResult.model,
        promptVersion: bundleResult.promptVersion,
      });

      rows.push({
        entityType: 'Product',
        entityId: productId,
        locale: 'en',
        field: 'description',
        value: bundleResult.product.description ?? '',
        sourceHash: bundleResult.product.descriptionSourceHash,
        model: bundleResult.model,
        promptVersion: bundleResult.promptVersion,
      });

      if (Array.isArray(bundleResult.features)) {
        for (const featureItem of bundleResult.features) {
          if (!featureItem.id) {
            throw new Error('번역 결과의 기능 ID가 누락되었습니다.');
          }
          if (typeof featureItem.name !== 'string' || !featureItem.name.trim()) {
            throw new Error(`번역 결과의 기능(${featureItem.id}) name이 누락되었거나 비어 있습니다.`);
          }
          rows.push({
            entityType: 'ProductFeature',
            entityId: featureItem.id,
            locale: 'en',
            field: 'name',
            value: featureItem.name,
            sourceHash: featureItem.nameSourceHash,
            model: bundleResult.model,
            promptVersion: bundleResult.promptVersion,
          });
          rows.push({
            entityType: 'ProductFeature',
            entityId: featureItem.id,
            locale: 'en',
            field: 'summary',
            value: featureItem.summary ?? '',
            sourceHash: featureItem.summarySourceHash,
            model: bundleResult.model,
            promptVersion: bundleResult.promptVersion,
          });
        }
      }

      if (jobId) {
        if (!options?.leaseToken || !this.translationJobRepository) {
          return { productId, leaseLost: true };
        }
        const committed = await this.translationJobRepository.commitTranslations(jobId, options.leaseToken, rows);
        if (!committed) return { productId, leaseLost: true };
      } else {
        await this.translationService.upsertTranslations(rows);
      }

      completedModel = bundleResult.model;
      completedPromptVersion = bundleResult.promptVersion;
    } catch (error) {
      // 인프라 재시도 가능 실패는 RetryableError 그대로 전달해 상위 재시도
      // 분류가 유지되도록 한다. 그 외에는 명시적 실패로 감싼다.
      if (error instanceof RetryableError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error(`[TranslationJobService] Product translation failed for ${productId}:`, error);
      throw new Error(`상품 번역에 실패했습니다: ${errorMessage}`);
    }

    return { productId, model: completedModel, promptVersion: completedPromptVersion };
  }

  async requestProductTranslationJob(identifier: { id?: string; slug?: string } | string): Promise<{
    id: string;
    entityType: string;
    entityId: string;
    status: string;
    message?: string | null;
    queued: boolean;
  }> {
    const query = typeof identifier === 'string' ? { id: identifier } : identifier;
    const product = await this.getProductUseCase.execute(query);
    if (!product) {
      throw new Error('Product가 존재하지 않습니다.');
    }

    const productId = product.id;

    if (!this.translationJobRepository) {
      await this.translateProductWithFeatures(productId);
      return {
        id: productId,
        entityType: 'Product',
        entityId: productId,
        status: 'completed',
        message: '상품 및 주요 기능 번역이 완료되었습니다.',
        queued: false,
      };
    }

    // createJob serializes active-intent lookup and creation in the repository.
    const job = await this.translationJobRepository.createJob({
      entityType: 'Product',
      entityId: productId,
      locale: 'en',
      status: 'pending',
      message: '번역 작업이 대기열에 등록되었습니다.',
    });

    // 큐 전송 실패는 pending으로 남겨 recovery tick이 재발견한다.
    // setImmediate 폴백을 제거하고, 전송 성공 여부만 정직하게 보고한다.
    const queued =
      job.status === 'in_progress' ||
      (await this.sendToQueue({
        jobId: job.id,
        entityType: 'Product',
        entityId: productId,
      }));

    return {
      id: job.id,
      entityType: 'Product',
      entityId: productId,
      status: job.status,
      message: job.message,
      queued,
    };
  }

  async getJob(id: string): Promise<TranslationJobEntity | null> {
    if (!this.translationJobRepository) {
      return null;
    }
    return this.translationJobRepository.findJobById(id);
  }

  async getJobs(options?: {
    status?: TranslationJobStatus;
    limit?: number;
    offset?: number;
  }): Promise<TranslationJobEntity[]> {
    if (!this.translationJobRepository) {
      return [];
    }
    return this.translationJobRepository.findJobs(options);
  }

  async retryProductTranslationJob(jobId: string): Promise<TranslationJobEntity & { queued: boolean }> {
    if (!this.translationJobRepository) {
      throw new Error('TranslationJobRepository가 설정되지 않았습니다.');
    }

    const job = await this.translationJobRepository.findJobById(jobId);
    if (!job) {
      throw new Error(`존재하지 않는 번역 작업입니다: ${jobId}`);
    }
    if ((job.attemptCount ?? 0) >= 5) {
      throw new Error('번역 작업의 최대 시도 횟수(5회)를 초과했습니다.');
    }
    // Retry participates in the same entity lock as new intent creation.
    if (job.status === 'failed') {
      const updatedJob = await this.translationJobRepository.claimJobStatus(jobId, ['failed'], 'pending', {
        message: 'LLM 번역 작업이 재시도 대기열에 등록되었습니다.',
        error: null,
      });
      if (!updatedJob) {
        throw new Error(`재시도 조건이 만료된 번역 작업입니다: ${jobId}`);
      }
      const queuedAfterRetry =
        updatedJob.status === 'in_progress' ||
        (await this.sendToQueue({
          jobId: updatedJob.id,
          entityType: updatedJob.entityType as 'Product' | 'Magazine' | 'ProductFeature',
          entityId: updatedJob.entityId,
        }));
      return { ...updatedJob, queued: queuedAfterRetry };
    }
    if (job.status === 'pending') {
      const queued = await this.sendToQueue({
        jobId: job.id,
        entityType: job.entityType as 'Product' | 'Magazine' | 'ProductFeature',
        entityId: job.entityId,
      });
      return { ...job, queued };
    }
    throw new Error(`재시도할 수 없는 번역 작업 상태입니다: ${job.status}`);
  }

  async executeProductTranslationJob(
    jobId: string,
    productId: string,
    options?: { leaseToken?: string; signal?: AbortSignal; stageBudgetMs?: number }
  ): Promise<void> {
    if (!this.translationJobRepository) {
      await this.translateProductWithFeatures(productId, jobId);
      return;
    }

    const repository = this.translationJobRepository;
    const leaseToken = options?.leaseToken ?? randomUUID();
    const claimed =
      typeof repository.claimJobLease === 'function'
        ? await repository.claimJobLease({
            jobId,
            leaseToken,
            leaseUntil: new Date(Date.now() + TRANSLATION_LEASE_MS),
          })
        : await repository.claimJobStatus(jobId, ['pending'], 'in_progress', {
            message: 'LLM으로 영문 번역을 생성하고 있습니다...',
          });
    if (!claimed) {
      return;
    }
    const ownedToken = claimed.leaseToken ?? leaseToken;

    try {
      const completedTranslation = await withWorkerDeadline(
        signal => this.translateProductWithFeatures(productId, jobId, { signal, leaseToken: ownedToken }),
        options?.stageBudgetMs ?? TRANSLATION_STAGE_BUDGET_MS,
        options?.signal
      );

      // stale/superseded 확정이나 lease 상실은 outer completed로 덮어쓰지 않는다.
      if (completedTranslation.stale || completedTranslation.leaseLost) {
        console.warn(
          `[TranslationJobService] Job ${jobId} stale or lease-lost; skipping outer completion to preserve terminal state.`
        );
        return;
      }

      // 상태 가드 완성: superseded/completed/failed로 이미 확정된 행은
      // leaseToken이 일치해도 completed로 덮어쓰지 않는다.
      // 선행 fence와 별개로 outer 완료 직전에도 소유권·상태를 재확인한다.
      if (typeof repository.completeJobLease === 'function') {
        const current = await repository.findJobById(jobId);
        if (!current || current.leaseToken !== ownedToken) {
          console.warn(`[TranslationJobService] Late attempt lost lease for job ${jobId}; discarding result.`);
          return;
        }
        if (current.status !== 'in_progress') {
          console.warn(
            `[TranslationJobService] Job ${jobId} already terminal (${current.status}); skipping outer completion.`
          );
          return;
        }
      }

      const completed =
        typeof repository.completeJobLease === 'function'
          ? await repository.completeJobLease(jobId, ownedToken, 'completed', {
              message: '상품 및 기능의 영문 번역이 완료되었습니다.',
              model: completedTranslation.model ?? null,
              promptVersion: completedTranslation.promptVersion ?? null,
            })
          : await repository.claimJobStatus(jobId, ['in_progress'], 'completed', {
              message: '상품 및 기능의 영문 번역이 완료되었습니다.',
              model: completedTranslation.model ?? null,
              promptVersion: completedTranslation.promptVersion ?? null,
            });
      if (!completed) {
        console.warn(`[TranslationJobService] Late attempt lost lease for job ${jobId}; discarding result.`);
      }
    } catch (error) {
      if (isAbortError(error) || (options?.signal?.aborted ?? false)) {
        console.warn(`[TranslationJobService] Job ${jobId} aborted; leaving lease to expire.`);
        return;
      }
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      const failed =
        typeof repository.completeJobLease === 'function'
          ? await repository.completeJobLease(jobId, ownedToken, 'failed', {
              error: errorMessage,
              message: '상품 번역에 실패했습니다.',
            })
          : await repository.claimJobStatus(jobId, ['pending', 'in_progress'], 'failed', {
              error: errorMessage,
              message: '상품 번역에 실패했습니다.',
            });
      if (!failed) {
        console.warn(`[TranslationJobService] Late failure for job ${jobId} lost lease; discarding.`);
        return;
      }
      console.error(`[TranslationJobService] Translation job ${jobId} failed:`, error);
    }
  }

  /**
   * 주기 recovery tick: 전송 누락 pending과 만료 lease in_progress를
   * 재발견해 큐로 다시 전송한다. 전송 실패는 pending으로 남긴다.
   */
  async recoverInterruptedJobs(input?: { now?: Date; limit?: number }): Promise<{ recovered: number; queued: number }> {
    if (!this.translationJobRepository || typeof this.translationJobRepository.findRecoverableJobs !== 'function') {
      return { recovered: 0, queued: 0 };
    }
    const jobs = await this.translationJobRepository.findRecoverableJobs({
      now: input?.now ?? new Date(),
      limit: input?.limit ?? 50,
    });
    let queued = 0;
    for (const job of jobs) {
      const sent = await this.sendToQueue({
        jobId: job.id,
        entityType: job.entityType as 'Product' | 'Magazine' | 'ProductFeature',
        entityId: job.entityId,
      });
      if (sent) {
        queued += 1;
      }
    }
    return { recovered: jobs.length, queued };
  }

  private async sendToQueue(payload: {
    jobId: string;
    entityType: 'Product' | 'Magazine' | 'ProductFeature';
    entityId: string;
  }): Promise<boolean> {
    if (!this.translationQueueService) {
      return false;
    }
    try {
      return await this.translationQueueService.sendJob(payload);
    } catch (error) {
      console.warn('[TranslationJobService] Failed to send job to SQS; leaving pending for recovery:', error);
      return false;
    }
  }

  async translateEntity(
    entityType: TranslationEntityType,
    entityId: string,
    fields: string[],
    options?: { signal?: AbortSignal }
  ): Promise<void> {
    const entity = await this.getEntity(entityType, entityId);
    const uniqueFields = this.getUniqueFields(fields);

    // 요청된 모든 필드를 먼저 스냅샷하고, 전체 유효할 때만 일괄 커밋한다.
    // 필드별 즉시 쓰기는 부분 실패 시 일부만 남기는 부분 커밋이 된다.
    const snapshots = uniqueFields.map(field => ({
      field,
      koreanValue: this.getKoreanValue(entityType, entity, field),
    }));

    const pending: UpsertTranslationParams[] = [];
    for (const snapshot of snapshots) {
      const { field, koreanValue } = snapshot;
      if (!koreanValue) {
        continue;
      }

      const fieldMetadata = TRANSLATABLE_FIELD_METADATA[entityType]?.fields[field];
      const isHtml = fieldMetadata?.isHtml ?? (field === 'description' || field === 'content');
      const mode = fieldMetadata?.mode ?? (isHtml ? 'editorial' : 'product_copy');

      const result = await this.translationProvider.translateSingle({
        entityType,
        entityId,
        field,
        koreanText: koreanValue,
        mode,
        isHtml,
        ...(options?.signal ? { signal: options.signal } : {}),
      });

      if (!result.translatedText || !result.translatedText.trim()) {
        throw new Error(`${entityType}의 ${field} 번역 결과가 비어 있습니다.`);
      }

      pending.push({
        entityType,
        entityId,
        locale: 'en',
        field,
        value: result.translatedText,
        sourceHash: result.sourceHash,
        model: result.model,
        promptVersion: result.promptVersion,
      });
    }

    if (pending.length === 0) {
      return;
    }

    // 쓰기 직전 스냅샷: 하나라도 바뀌었으면 전체를 명시적으로 버린다.
    const currentEntity = await this.getEntity(entityType, entityId);
    for (const snapshot of snapshots) {
      if (!snapshot.koreanValue) {
        continue;
      }
      const currentKorean = this.getKoreanValue(entityType, currentEntity, snapshot.field);
      if (currentKorean !== snapshot.koreanValue) {
        throw new Error(`${entityType}의 ${snapshot.field} 원문이 번역 도중 수정되어 번역 결과가 폐기되었습니다.`);
      }
    }

    if (typeof this.translationService.upsertTranslations === 'function') {
      await this.translationService.upsertTranslations(pending);
    } else {
      for (const row of pending) {
        await this.translationService.upsertTranslation(row);
      }
    }
  }

  private getUniqueFields(fields: string[]): string[] {
    return [...new Set(fields.map(field => field.trim()).filter(Boolean))];
  }

  private async getEntity(
    entityType: TranslationEntityType,
    entityId: string
  ): Promise<Product | Magazine | ProductFeature> {
    if (entityType === 'Product') {
      const product = await this.getProductUseCase.execute({ id: entityId });
      if (!product) {
        throw new Error('Product가 존재하지 않습니다.');
      }

      return product;
    }

    if (entityType === 'Magazine') {
      const magazine = await this.getMagazineUseCase.execute({ id: entityId });
      if (!magazine) {
        throw new Error('Magazine이 존재하지 않습니다.');
      }

      return magazine;
    }

    if (entityType === 'ProductFeature') {
      if (!this.getProductFeatureUseCase) {
        throw new Error('GetProductFeature usecase가 주입되지 않았습니다.');
      }
      const feature = await this.getProductFeatureUseCase.execute({
        id: entityId,
      });
      if (!feature) {
        throw new Error('ProductFeature가 존재하지 않습니다.');
      }

      return feature;
    }

    throw new Error(`지원하지 않는 엔티티 타입입니다: ${entityType}`);
  }

  private getKoreanValue(
    entityType: TranslationEntityType,
    entity: Product | Magazine | ProductFeature,
    field: string
  ): string | undefined {
    const fieldMetadata = TRANSLATABLE_FIELD_METADATA[entityType]?.fields[field];
    if (!fieldMetadata) {
      throw new Error(`${entityType}의 번역 가능한 필드가 아닙니다: ${field}`);
    }

    const value = (entity as unknown as Record<string, unknown>)[fieldMetadata.property];
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmedValue = value.trim();
    return trimmedValue || undefined;
  }
}
