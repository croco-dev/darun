import 'reflect-metadata';
import { Magazine } from '@darun/magazines-domain';
import type { GetMagazine } from '@darun/magazines-domain';
import { Product, ProductFeature } from '@darun/products-domain';
import type { GetProduct, GetProductFeature, GetProductFeatures } from '@darun/products-domain';
import type { LlmClient } from '@darun/utils-llm';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { TranslationService } from '../services/TranslationService';

vi.mock('typedi', async importOriginal => ({
  ...(await importOriginal<typeof import('typedi')>()),
  Inject: () => () => undefined,
  Service: () => () => undefined,
}));

let TranslationJobService: typeof import('@darun/translation-service').TranslationJobService;
let TRANSLATABLE_FIELD_METADATA: typeof import('@darun/translation-service').TRANSLATABLE_FIELD_METADATA;

type UpsertParams = Parameters<TranslationService['upsertTranslation']>[0];

const createTranslationService = () =>
  ({
    upsertTranslation: vi.fn<TranslationService['upsertTranslation']>().mockResolvedValue(undefined),
  }) satisfies Pick<TranslationService, 'upsertTranslation'>;

type CustomLlmImplementation = (modelOrMessages: unknown, maybeMessages?: unknown) => Promise<{ content: string }>;

const createLlmClient = (customImplementation?: CustomLlmImplementation) => ({
  completion: vi.fn().mockImplementation(
    customImplementation ??
      (async (modelOrMessages: unknown, maybeMessages?: unknown) => {
        const messages: Array<{ role?: string; content: string }> = Array.isArray(modelOrMessages)
          ? (modelOrMessages as Array<{ role?: string; content: string }>)
          : ((maybeMessages as Array<{ role?: string; content: string }>) ?? []);
        const userMessage = messages.find(m => m.role === 'user') ?? messages[0];
        return {
          content: `en:${userMessage?.content.split(': ').pop()}`,
        };
      })
  ),
});

const createProductUseCase = (product?: Product) =>
  ({
    execute: vi.fn<GetProduct['execute']>().mockResolvedValue(product ?? null),
  }) as unknown as GetProduct;

const createMagazineUseCase = (magazine?: Magazine) =>
  ({
    execute: vi.fn<GetMagazine['execute']>().mockResolvedValue(magazine ?? null),
  }) as unknown as GetMagazine;

const createProductFeatureUseCase = (feature?: ProductFeature | null) =>
  ({
    execute: vi.fn<GetProductFeature['execute']>().mockResolvedValue(feature ?? null),
  }) as unknown as GetProductFeature;

const createProductFeaturesUseCase = (features?: ProductFeature[]) =>
  ({
    execute: vi.fn<GetProductFeatures['execute']>().mockResolvedValue(features ?? []),
  }) as unknown as GetProductFeatures;

const createService = ({
  product,
  magazine,
  feature,
  features,
  customLlmImplementation,
}: {
  product?: Product;
  magazine?: Magazine;
  feature?: ProductFeature;
  features?: ProductFeature[];
  customLlmImplementation?: CustomLlmImplementation;
} = {}) => {
  const translationService = createTranslationService();
  const llmClient = createLlmClient(customLlmImplementation);

  return {
    service: new TranslationJobService(
      createProductUseCase(product),
      createMagazineUseCase(magazine),
      translationService as unknown as TranslationService,
      llmClient as unknown as LlmClient,
      createProductFeatureUseCase(feature),
      createProductFeaturesUseCase(features)
    ),
    translationService,
    llmClient,
  };
};

describe('TranslationJobService', () => {
  beforeAll(async () => {
    const module = await import('@darun/translation-service');
    TranslationJobService = module.TranslationJobService;
    TRANSLATABLE_FIELD_METADATA = module.TRANSLATABLE_FIELD_METADATA;
  });

  it('translates product fields declared in translation metadata and keeps request dedupe', async () => {
    const product = new Product({
      id: 'product-1',
      slug: 'product-1',
      name: '제품명',
      summary: '요약',
      description: '설명',
      logoUrl: 'https://example.com/logo.png',
    });
    const { service, translationService } = createService({ product });

    await service.translateEntity('Product', product.id, [' name ', 'summary', 'name', 'description']);

    expect(translationService.upsertTranslation).toHaveBeenCalledTimes(3);
    expect(translationService.upsertTranslation.mock.calls.map(([params]: [UpsertParams]) => params.field)).toEqual([
      'name',
      'summary',
      'description',
    ]);
  });

  it('translates magazine fields declared in translation metadata', async () => {
    const magazine = new Magazine({
      id: 'magazine-1',
      title: '매거진 제목',
      summary: '매거진 요약',
      content: '매거진 본문',
      backgroundImageUrl: 'https://example.com/background.png',
      authorId: 'author-1',
    });
    const { service, translationService } = createService({ magazine });

    await service.translateEntity('Magazine', magazine.id, ['title', 'summary', 'content']);

    expect(translationService.upsertTranslation.mock.calls.map(([params]: [UpsertParams]) => params.field)).toEqual([
      'title',
      'summary',
      'content',
    ]);
  });

  it('rejects fields that are not declared in translation metadata', async () => {
    const product = new Product({
      id: 'product-1',
      slug: 'product-1',
      name: '제품명',
      summary: '요약',
      logoUrl: 'https://example.com/logo.png',
    });
    const { service } = createService({ product });

    await expect(service.translateEntity('Product', product.id, ['slug'])).rejects.toThrow(
      'Product의 번역 가능한 필드가 아닙니다: slug'
    );
  });

  it('detects a newly declared translatable field from metadata only', async () => {
    const product = Object.assign(
      new Product({
        id: 'product-1',
        slug: 'product-1',
        name: '제품명',
        summary: '요약',
        logoUrl: 'https://example.com/logo.png',
      }),
      { tagline: '한 줄 소개' }
    );
    TRANSLATABLE_FIELD_METADATA.Product.fields.tagline = {
      property: 'tagline',
    };
    const { service, translationService } = createService({ product });

    await service.translateEntity('Product', product.id, ['tagline']);

    expect(translationService.upsertTranslation).toHaveBeenCalledWith({
      entityType: 'Product',
      entityId: product.id,
      locale: 'en',
      field: 'tagline',
      value: 'en:한 줄 소개',
    });
    delete TRANSLATABLE_FIELD_METADATA.Product.fields.tagline;
  });

  it('translates product feature fields declared in metadata', async () => {
    const feature = new ProductFeature({
      id: 'feature-1',
      productId: 'product-1',
      name: '핵심 기능',
      summary: '기능 요약 설명',
      emoji: '✨',
    });
    const { service, translationService } = createService({ feature });

    await service.translateEntity('ProductFeature', feature.id, ['name', 'summary']);

    expect(translationService.upsertTranslation).toHaveBeenCalledTimes(2);
    expect(translationService.upsertTranslation).toHaveBeenCalledWith({
      entityType: 'ProductFeature',
      entityId: feature.id,
      locale: 'en',
      field: 'name',
      value: 'en:핵심 기능',
    });
    expect(translationService.upsertTranslation).toHaveBeenCalledWith({
      entityType: 'ProductFeature',
      entityId: feature.id,
      locale: 'en',
      field: 'summary',
      value: 'en:기능 요약 설명',
    });
  });

  it('translates product with features in a single contextual JSON LLM call', async () => {
    const product = new Product({
      id: 'product-1',
      slug: 'toss',
      name: '토스',
      summary: '금융의 모든 것을 한 곳에서',
      description: '<p>간편 송금과 결제 서비스</p>',
      logoUrl: 'https://example.com/logo.png',
    });
    const features = [
      new ProductFeature({
        id: 'feat-1',
        productId: 'product-1',
        name: '간편 송금',
        summary: '무료 송금',
        emoji: '💸',
      }),
    ];

    const mockJsonResponse = JSON.stringify({
      name: 'Toss',
      summary: 'All-in-one finance platform',
      description: '<p>Simple money transfer and payments</p>',
      features: [
        {
          id: 'feat-1',
          name: 'Easy Transfer',
          summary: 'Free money transfers',
        },
      ],
    });

    const { service, translationService, llmClient } = createService({
      product,
      features,
      customLlmImplementation: async () => ({
        content: `\`\`\`json\n${mockJsonResponse}\n\`\`\``,
      }),
    });

    await service.translateProductWithFeatures(product.id);

    expect(llmClient.completion).toHaveBeenCalledTimes(1);
    expect(translationService.upsertTranslation).toHaveBeenCalledWith({
      entityType: 'Product',
      entityId: product.id,
      locale: 'en',
      field: 'name',
      value: 'Toss',
    });
    expect(translationService.upsertTranslation).toHaveBeenCalledWith({
      entityType: 'Product',
      entityId: product.id,
      locale: 'en',
      field: 'summary',
      value: 'All-in-one finance platform',
    });
    expect(translationService.upsertTranslation).toHaveBeenCalledWith({
      entityType: 'Product',
      entityId: product.id,
      locale: 'en',
      field: 'description',
      value: '<p>Simple money transfer and payments</p>',
    });
    expect(translationService.upsertTranslation).toHaveBeenCalledWith({
      entityType: 'ProductFeature',
      entityId: 'feat-1',
      locale: 'en',
      field: 'name',
      value: 'Easy Transfer',
    });
    expect(translationService.upsertTranslation).toHaveBeenCalledWith({
      entityType: 'ProductFeature',
      entityId: 'feat-1',
      locale: 'en',
      field: 'summary',
      value: 'Free money transfers',
    });
  });

  it('handles LLM response containing surrounding commentary around JSON', async () => {
    const product = new Product({
      id: 'prod-commentary',
      slug: 'commentary',
      name: '도구',
      summary: '도구 요약',
      description: '<p>설명</p>',
      logoUrl: 'https://example.com/logo.png',
    });

    const mockJsonResponse = JSON.stringify({
      name: 'Tool',
      summary: 'Powerful productivity tool for teams',
      description: '<p>Description</p>',
      features: [],
    });

    const { service, translationService } = createService({
      product,
      customLlmImplementation: async () => ({
        content: `Here is the requested translation:\n${mockJsonResponse}\nHope this helps!`,
      }),
    });

    await service.translateProductWithFeatures(product.id);

    expect(translationService.upsertTranslation).toHaveBeenCalledWith({
      entityType: 'Product',
      entityId: product.id,
      locale: 'en',
      field: 'name',
      value: 'Tool',
    });
    expect(translationService.upsertTranslation).toHaveBeenCalledWith({
      entityType: 'Product',
      entityId: product.id,
      locale: 'en',
      field: 'summary',
      value: 'Powerful productivity tool for teams',
    });
  });

  it('fails fast and throws descriptive error when LLM completion fails without cascading fallback', async () => {
    const product = new Product({
      id: 'product-timeout',
      slug: 'timeout-prod',
      name: '타임아웃 상품',
      summary: '요약',
      description: '설명',
      logoUrl: 'https://example.com/logo.png',
    });

    const { service, llmClient, translationService } = createService({
      product,
      customLlmImplementation: async () => {
        throw new Error('LLM 통합 번역 요청이 시간 초과되었습니다.');
      },
    });

    await expect(service.translateProductWithFeatures(product.id)).rejects.toThrow(
      '상품 번역에 실패했습니다: LLM 통합 번역 요청이 시간 초과되었습니다.'
    );

    expect(llmClient.completion).toHaveBeenCalledTimes(1);
    expect(translationService.upsertTranslation).not.toHaveBeenCalled();
  });

  it('retries product translation job and sets status to pending', async () => {
    const now = new Date();
    const mockRepo = {
      createJob: vi.fn(),
      findJobById: vi.fn().mockResolvedValue({
        id: 'job-failed',
        entityType: 'Product',
        entityId: 'prod-123',
        locale: 'en',
        status: 'failed',
        message: '실패',
        error: '429 Rate limit',
        createdAt: now,
        updatedAt: now,
      }),
      updateJobStatus: vi.fn().mockResolvedValue({
        id: 'job-failed',
        entityType: 'Product',
        entityId: 'prod-123',
        locale: 'en',
        status: 'pending',
        message: 'LLM 번역 작업이 재시도 대기열에 등록되었습니다.',
        error: null,
        createdAt: now,
        updatedAt: now,
      }),
      findJobs: vi.fn().mockResolvedValue([]),
    };

    const mockQueueService = {
      sendJob: vi.fn().mockResolvedValue(true),
    };

    const translationService = createTranslationService();
    const llmClient = createLlmClient();

    const service = new TranslationJobService(
      createProductUseCase(),
      createMagazineUseCase(),
      translationService as unknown as TranslationService,
      llmClient as unknown as LlmClient,
      createProductFeatureUseCase(),
      createProductFeaturesUseCase(),
      mockRepo as never,
      mockQueueService as never
    );

    const result = await service.retryProductTranslationJob('job-failed');

    expect(mockRepo.findJobById).toHaveBeenCalledWith('job-failed');
    expect(mockRepo.updateJobStatus).toHaveBeenCalledWith('job-failed', 'pending', {
      message: 'LLM 번역 작업이 재시도 대기열에 등록되었습니다.',
      error: null,
      resetCreatedAt: true,
    });
    expect(mockQueueService.sendJob).toHaveBeenCalledWith({
      jobId: 'job-failed',
      entityType: 'Product',
      entityId: 'prod-123',
    });
    expect(result.status).toBe('pending');
  });

  it('returns list of jobs from repository in getJobs', async () => {
    const mockRepo = {
      createJob: vi.fn(),
      findJobById: vi.fn(),
      updateJobStatus: vi.fn(),
      findJobs: vi.fn().mockResolvedValue([
        {
          id: 'job-1',
          entityType: 'Product',
          entityId: 'prod-1',
          locale: 'en',
          status: 'completed',
        },
      ]),
    };

    const translationService = createTranslationService();
    const llmClient = createLlmClient();

    const service = new TranslationJobService(
      createProductUseCase(),
      createMagazineUseCase(),
      translationService as unknown as TranslationService,
      llmClient as unknown as LlmClient,
      createProductFeatureUseCase(),
      createProductFeaturesUseCase(),
      mockRepo as never
    );

    const jobs = await service.getJobs({ status: 'completed', limit: 10 });
    expect(mockRepo.findJobs).toHaveBeenCalledWith({ status: 'completed', limit: 10 });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.id).toBe('job-1');
  });
});
