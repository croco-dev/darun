import { GetMagazine, Magazine } from '@darun/magazines-domain';
import { GetProduct, GetProductFeature, GetProductFeatures, Product, ProductFeature } from '@darun/products-domain';
import {
  computeSourceHash,
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
import { LlmClient } from '@darun/utils-llm';
import { Inject, Service } from 'typedi';
import { TranslationQueueService } from './TranslationQueueService';

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
    const parsed = JSON.parse(target);

    return {
      product: {
        name: parsed.name ?? '',
        summary: parsed.summary ?? '',
        description: parsed.description ?? '',
        nameSourceHash: computeSourceHash(request.name),
        summarySourceHash: computeSourceHash(request.summary),
        descriptionSourceHash: computeSourceHash(request.description),
      },
      features: (parsed.features ?? []).map((f: { id?: string; name?: string; summary?: string }) => {
        const reqF = request.features.find(rf => rf.id === f.id);
        return {
          id: f.id,
          name: f.name ?? '',
          summary: f.summary ?? '',
          nameSourceHash: reqF ? computeSourceHash(reqF.name) : '',
          summarySourceHash: reqF ? computeSourceHash(reqF.summary) : '',
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
      typeof (translationProviderOrLlmClient as TranslationProvider).translateProductBundle === 'function'
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
    jobId?: string
  ): Promise<string> {
    const query = typeof identifier === 'string' ? { id: identifier } : identifier;
    const product = await this.getProductUseCase.execute(query);
    if (!product) {
      throw new Error('Product가 존재하지 않습니다.');
    }

    const productId = product.id;

    let features: ProductFeature[] = [];
    if (this.getProductFeaturesUseCase) {
      try {
        features = await this.getProductFeaturesUseCase.execute({ productId });
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
      });

      // Pre-write snapshot check: re-read source to prevent stale overwrite
      const currentProduct = await this.getProductUseCase.execute({ id: productId });
      if (!currentProduct) {
        throw new Error('Product가 번역 도중 삭제되었습니다.');
      }

      let isStale =
        computeSourceHash(currentProduct.name) !== startProductHash.name ||
        computeSourceHash(currentProduct.summary) !== startProductHash.summary ||
        computeSourceHash(currentProduct.description || '') !== startProductHash.description;

      let currentFeatures: ProductFeature[] = [];
      if (this.getProductFeaturesUseCase) {
        try {
          currentFeatures = await this.getProductFeaturesUseCase.execute({ productId });
        } catch (error) {
          console.warn(`Failed to re-fetch features for product ${productId}:`, error);
        }
      }

      if (!isStale) {
        if (currentFeatures.length !== features.length) {
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
          await this.translationJobRepository.updateJobStatus(jobId, 'superseded', {
            message: '원문이 번역 도중 수정되어 번역 결과가 폐기되었습니다.',
          });
        }
        return productId;
      }

      const rows: UpsertTranslationParams[] = [];

      if (bundleResult.product.name) {
        rows.push({
          entityType: 'Product',
          entityId: productId,
          locale: 'en',
          field: 'name',
          value: bundleResult.product.name,
          sourceHash: bundleResult.product.nameSourceHash,
          model: bundleResult.model,
          promptVersion: bundleResult.promptVersion,
        });
      }

      if (bundleResult.product.summary) {
        rows.push({
          entityType: 'Product',
          entityId: productId,
          locale: 'en',
          field: 'summary',
          value: bundleResult.product.summary,
          sourceHash: bundleResult.product.summarySourceHash,
          model: bundleResult.model,
          promptVersion: bundleResult.promptVersion,
        });
      }

      if (bundleResult.product.description) {
        rows.push({
          entityType: 'Product',
          entityId: productId,
          locale: 'en',
          field: 'description',
          value: bundleResult.product.description,
          sourceHash: bundleResult.product.descriptionSourceHash,
          model: bundleResult.model,
          promptVersion: bundleResult.promptVersion,
        });
      }

      if (Array.isArray(bundleResult.features)) {
        for (const featureItem of bundleResult.features) {
          if (!featureItem.id) continue;
          if (featureItem.name) {
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
          }
          if (featureItem.summary) {
            rows.push({
              entityType: 'ProductFeature',
              entityId: featureItem.id,
              locale: 'en',
              field: 'summary',
              value: featureItem.summary,
              sourceHash: featureItem.summarySourceHash,
              model: bundleResult.model,
              promptVersion: bundleResult.promptVersion,
            });
          }
        }
      }

      if (typeof this.translationService.upsertTranslations === 'function') {
        await this.translationService.upsertTranslations(rows);
      } else {
        for (const row of rows) {
          await this.translationService.upsertTranslation(row);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error(`[TranslationJobService] Product translation failed for ${productId}:`, error);
      throw new Error(`상품 번역에 실패했습니다: ${errorMessage}`);
    }

    return productId;
  }

  async requestProductTranslationJob(identifier: { id?: string; slug?: string } | string): Promise<{
    id: string;
    entityType: string;
    entityId: string;
    status: string;
    message?: string | null;
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
      };
    }

    const job = await this.translationJobRepository.createJob({
      entityType: 'Product',
      entityId: productId,
      locale: 'en',
      status: 'pending',
      message: '번역 작업이 대기열에 등록되었습니다.',
    });

    let isQueued = false;
    if (this.translationQueueService) {
      try {
        isQueued = await this.translationQueueService.sendJob({
          jobId: job.id,
          entityType: 'Product',
          entityId: productId,
        });
      } catch (err) {
        console.warn('[TranslationJobService] Failed to send job to SQS, falling back to background process:', err);
      }
    }

    if (!isQueued) {
      setImmediate(() => {
        void this.executeProductTranslationJob(job.id, productId);
      });
    }

    return {
      id: job.id,
      entityType: 'Product',
      entityId: productId,
      status: job.status,
      message: job.message,
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

  async retryProductTranslationJob(jobId: string): Promise<TranslationJobEntity> {
    if (!this.translationJobRepository) {
      throw new Error('TranslationJobRepository가 설정되지 않았습니다.');
    }

    const job = await this.translationJobRepository.findJobById(jobId);
    if (!job) {
      throw new Error(`존재하지 않는 번역 작업입니다: ${jobId}`);
    }

    const updatedJob = await this.translationJobRepository.updateJobStatus(jobId, 'pending', {
      message: 'LLM 번역 작업이 재시도 대기열에 등록되었습니다.',
      error: null,
    });

    let isQueued = false;
    if (this.translationQueueService) {
      try {
        isQueued = await this.translationQueueService.sendJob({
          jobId: job.id,
          entityType: job.entityType as 'Product' | 'Magazine' | 'ProductFeature',
          entityId: job.entityId,
        });
      } catch (error) {
        console.warn(
          `[TranslationJobService] Failed to send retry job ${jobId} to SQS queue, falling back to in-process execution:`,
          error
        );
      }
    }

    if (!isQueued) {
      setImmediate(() => {
        void this.executeProductTranslationJob(job.id, job.entityId);
      });
    }

    return updatedJob;
  }

  async executeProductTranslationJob(jobId: string, productId: string): Promise<void> {
    if (!this.translationJobRepository) {
      await this.translateProductWithFeatures(productId, jobId);
      return;
    }

    try {
      await this.translationJobRepository.updateJobStatus(jobId, 'in_progress', {
        message: 'LLM으로 영문 번역을 생성하고 있습니다...',
      });

      await this.translateProductWithFeatures(productId, jobId);

      const latestJob = await this.translationJobRepository.findJobById(jobId);
      if (latestJob?.status !== 'superseded') {
        await this.translationJobRepository.updateJobStatus(jobId, 'completed', {
          message: '상품 및 기능의 영문 번역이 완료되었습니다.',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error(`[TranslationJobService] Translation job ${jobId} failed:`, error);
      await this.translationJobRepository.updateJobStatus(jobId, 'failed', {
        error: errorMessage,
        message: '상품 번역에 실패했습니다.',
      });
    }
  }

  async translateEntity(entityType: TranslationEntityType, entityId: string, fields: string[]): Promise<void> {
    const entity = await this.getEntity(entityType, entityId);
    const uniqueFields = this.getUniqueFields(fields);

    for (const field of uniqueFields) {
      const koreanValue = this.getKoreanValue(entityType, entity, field);
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
      });

      // Pre-write snapshot check for single entity field
      const currentEntity = await this.getEntity(entityType, entityId);
      const currentKorean = this.getKoreanValue(entityType, currentEntity, field);
      if (currentKorean !== koreanValue) {
        console.warn(
          `[TranslationJobService] Source text changed during translation for ${entityType} ${entityId} field ${field}. Skipping stale write.`
        );
        continue;
      }

      await this.translationService.upsertTranslation({
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
