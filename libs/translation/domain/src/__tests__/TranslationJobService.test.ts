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
      mode: 'label',
    };
    const { service, translationService } = createService({ product });

    await service.translateEntity('Product', product.id, ['tagline']);

    expect(translationService.upsertTranslation).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'Product',
        entityId: product.id,
        locale: 'en',
        field: 'tagline',
        value: 'en:한 줄 소개',
      })
    );
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
    expect(translationService.upsertTranslation).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'ProductFeature',
        entityId: feature.id,
        locale: 'en',
        field: 'name',
        value: 'en:핵심 기능',
      })
    );
    expect(translationService.upsertTranslation).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'ProductFeature',
        entityId: feature.id,
        locale: 'en',
        field: 'summary',
        value: 'en:기능 요약 설명',
      })
    );
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
    expect(translationService.upsertTranslation).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'Product',
        entityId: product.id,
        locale: 'en',
        field: 'name',
        value: 'Toss',
      })
    );
    expect(translationService.upsertTranslation).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'Product',
        entityId: product.id,
        locale: 'en',
        field: 'summary',
        value: 'All-in-one finance platform',
      })
    );
    expect(translationService.upsertTranslation).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'Product',
        entityId: product.id,
        locale: 'en',
        field: 'description',
        value: '<p>Simple money transfer and payments</p>',
      })
    );
    expect(translationService.upsertTranslation).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'ProductFeature',
        entityId: 'feat-1',
        locale: 'en',
        field: 'name',
        value: 'Easy Transfer',
      })
    );
    expect(translationService.upsertTranslation).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'ProductFeature',
        entityId: 'feat-1',
        locale: 'en',
        field: 'summary',
        value: 'Free money transfers',
      })
    );
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

  it('registers and enqueues a pending product translation without invoking the LLM', async () => {
    const product = new Product({
      id: 'prod-queued',
      slug: 'queued-product',
      name: '상품',
      summary: '요약',
      logoUrl: 'https://example.com/logo.png',
    });
    const job = {
      id: 'job-queued',
      status: 'pending',
      message: '번역 작업이 대기열에 등록되었습니다.',
    };
    const repository = { createJob: vi.fn().mockResolvedValue(job) };
    let completeEnqueue!: (queued: boolean) => void;
    const queue = {
      sendJob: vi.fn(
        () =>
          new Promise<boolean>(resolve => {
            completeEnqueue = resolve;
          })
      ),
    };
    const translationService = createTranslationService();
    const llmClient = createLlmClient(() => new Promise(() => {}));
    const service = new TranslationJobService(
      createProductUseCase(product),
      createMagazineUseCase(),
      translationService as unknown as TranslationService,
      llmClient as unknown as LlmClient,
      createProductFeatureUseCase(),
      createProductFeaturesUseCase(),
      repository as never,
      queue as never
    );

    const onResponse = vi.fn();
    const response = service.requestProductTranslationJob(product.id).then(onResponse);
    await vi.waitFor(() => {
      expect(queue.sendJob).toHaveBeenCalledWith({
        jobId: job.id,
        entityType: 'Product',
        entityId: product.id,
      });
    });
    expect(repository.createJob).toHaveBeenCalledWith({
      entityType: 'Product',
      entityId: product.id,
      locale: 'en',
      status: 'pending',
      message: '번역 작업이 대기열에 등록되었습니다.',
    });
    expect(onResponse).not.toHaveBeenCalled();
    completeEnqueue(true);
    await response;
    await new Promise(resolve => setImmediate(resolve));

    expect(onResponse).toHaveBeenCalledWith({
      ...job,
      entityType: 'Product',
      entityId: product.id,
    });
    expect(llmClient.completion).not.toHaveBeenCalled();
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

  it('aborts write and marks job superseded when product source content changes during translation', async () => {
    const initialProduct = new Product({
      id: 'prod-race',
      slug: 'race-product',
      name: '원래 이름',
      summary: '원래 요약',
      description: '원래 설명',
      logoUrl: 'https://example.com/logo.png',
    });

    const modifiedProduct = new Product({
      id: 'prod-race',
      slug: 'race-product',
      name: '수정된 이름',
      summary: '원래 요약',
      description: '원래 설명',
      logoUrl: 'https://example.com/logo.png',
    });

    const getProductExecute = vi
      .fn<GetProduct['execute']>()
      .mockResolvedValueOnce(initialProduct) // first read
      .mockResolvedValueOnce(modifiedProduct); // second pre-write re-read

    const getProductUseCase = { execute: getProductExecute } as unknown as GetProduct;
    const translationService = createTranslationService();
    const mockRepo = {
      createJob: vi.fn(),
      findJobById: vi.fn(),
      updateJobStatus: vi.fn().mockResolvedValue({} as never),
      findJobs: vi.fn(),
    };

    const mockJsonResponse = JSON.stringify({
      name: 'Original Name',
      summary: 'Original Summary',
      description: 'Original Description',
      features: [],
    });

    const llmClient = createLlmClient(async () => ({
      content: `\`\`\`json\n${mockJsonResponse}\n\`\`\``,
    }));

    const service = new TranslationJobService(
      getProductUseCase,
      createMagazineUseCase(),
      translationService as unknown as TranslationService,
      llmClient as unknown as LlmClient,
      createProductFeatureUseCase(),
      createProductFeaturesUseCase(),
      mockRepo as never
    );

    await service.translateProductWithFeatures('prod-race', 'job-stale-check');

    expect(translationService.upsertTranslation).not.toHaveBeenCalled();
    expect(mockRepo.updateJobStatus).toHaveBeenCalledWith('job-stale-check', 'superseded', {
      message: '원문이 번역 도중 수정되어 번역 결과가 폐기되었습니다.',
    });
  });

  it('writes product translation when feature re-fetch fails after a successful initial fetch', async () => {
    const product = new Product({
      id: 'prod-refetch-fail',
      slug: 'refetch-fail',
      name: '재조회 실패 상품',
      summary: '요약',
      description: '설명',
      logoUrl: 'https://example.com/logo.png',
    });
    const features = [
      new ProductFeature({
        id: 'feat-1',
        productId: 'prod-refetch-fail',
        name: '실제 기능',
        summary: '실제 요약',
        emoji: '✨',
      }),
    ];

    const mockJsonResponse = JSON.stringify({
      name: 'Refetch Fail Product',
      summary: 'Summary',
      description: 'Description',
      features: [{ id: 'feat-1', name: 'Real Feature', summary: 'Real summary' }],
    });

    const getProductUseCase = createProductUseCase(product);
    const translationService = createTranslationService();
    const llmClient = createLlmClient(async () => ({ content: mockJsonResponse }));
    const getProductFeaturesUseCase = {
      execute: vi
        .fn<GetProductFeatures['execute']>()
        .mockResolvedValueOnce(features)
        .mockRejectedValueOnce(new Error('transient DB error')),
    } as unknown as GetProductFeatures;

    const service = new TranslationJobService(
      getProductUseCase,
      createMagazineUseCase(),
      translationService as unknown as TranslationService,
      llmClient as unknown as LlmClient,
      createProductFeatureUseCase(),
      getProductFeaturesUseCase
    );

    await service.translateProductWithFeatures(product.id);

    expect(translationService.upsertTranslation).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'Product',
        entityId: product.id,
        field: 'name',
        value: 'Refetch Fail Product',
      })
    );
  });

  it('rejects bundle responses with hallucinated or missing feature IDs', async () => {
    const product = new Product({
      id: 'product-halluc',
      slug: 'halluc-prod',
      name: '환각 상품',
      summary: '요약',
      description: '설명',
      logoUrl: 'https://example.com/logo.png',
    });
    const features = [
      new ProductFeature({
        id: 'feat-1',
        productId: 'product-halluc',
        name: '실제 기능',
        summary: '실제 요약',
        emoji: '✨',
      }),
    ];

    const hallucinated = JSON.stringify({
      name: 'Halluc',
      summary: 'Halluc summary',
      description: 'Halluc desc',
      features: [{ id: 'feat-evil', name: 'Evil', summary: 'Evil summary' }],
    });

    const { service, translationService } = createService({
      product,
      features,
      customLlmImplementation: async () => ({ content: hallucinated }),
    });

    await expect(service.translateProductWithFeatures(product.id)).rejects.toThrow(
      '상품 번역에 실패했습니다: 번역 결과에 알 수 없는 기능 ID(feat-evil)가 포함되었습니다.'
    );
    expect(translationService.upsertTranslation).not.toHaveBeenCalled();

    const incomplete = JSON.stringify({
      name: 'Halluc',
      summary: 'Halluc summary',
      description: 'Halluc desc',
      features: [],
    });

    const retry = createService({
      product,
      features,
      customLlmImplementation: async () => ({ content: incomplete }),
    });

    await expect(retry.service.translateProductWithFeatures(product.id)).rejects.toThrow(
      '상품 번역에 실패했습니다: 기능 개수 불일치: 요청 1개, 응답 0개'
    );
    expect(retry.translationService.upsertTranslation).not.toHaveBeenCalled();
  });

  it('rejects unparseable bundle JSON without writing translations', async () => {
    const product = new Product({
      id: 'product-badjson',
      slug: 'badjson-prod',
      name: '깨진 상품',
      summary: '요약',
      description: '설명',
      logoUrl: 'https://example.com/logo.png',
    });

    const { service, translationService } = createService({
      product,
      customLlmImplementation: async () => ({ content: 'not-json-at-all' }),
    });

    await expect(service.translateProductWithFeatures(product.id)).rejects.toThrow(
      '상품 번역에 실패했습니다: LLM 번역 응답 JSON 파싱에 실패했습니다.'
    );
    expect(translationService.upsertTranslation).not.toHaveBeenCalled();
  });

  it('skips duplicate execution when the job is already claimed', async () => {
    const product = new Product({
      id: 'prod-claim',
      slug: 'claim-prod',
      name: '선점 상품',
      summary: '요약',
      description: '설명',
      logoUrl: 'https://example.com/logo.png',
    });

    const mockJsonResponse = JSON.stringify({
      name: 'Claimed Product',
      summary: 'Summary',
      description: 'Description',
      features: [],
    });

    const translationService = createTranslationService();
    const llmClient = createLlmClient(async () => ({ content: mockJsonResponse }));
    const mockRepo = {
      createJob: vi.fn(),
      findJobById: vi.fn(),
      updateJobStatus: vi.fn(),
      claimJobStatus: vi.fn().mockResolvedValue(null),
      findJobs: vi.fn(),
    };

    const service = new TranslationJobService(
      createProductUseCase(product),
      createMagazineUseCase(),
      translationService as unknown as TranslationService,
      llmClient as unknown as LlmClient,
      createProductFeatureUseCase(),
      createProductFeaturesUseCase(),
      mockRepo as never
    );

    await service.executeProductTranslationJob('job-claim', product.id);

    expect(mockRepo.claimJobStatus).toHaveBeenCalledWith('job-claim', ['pending'], 'in_progress', {
      message: 'LLM으로 영문 번역을 생성하고 있습니다...',
    });
    expect(llmClient.completion).not.toHaveBeenCalled();
    expect(translationService.upsertTranslation).not.toHaveBeenCalled();
  });

  it('does not overwrite a terminal job status when translation fails', async () => {
    const product = new Product({
      id: 'prod-terminal',
      slug: 'terminal-prod',
      name: '터미널 상품',
      summary: '요약',
      description: '설명',
      logoUrl: 'https://example.com/logo.png',
    });

    const claimed = {
      id: 'job-terminal',
      entityType: 'Product',
      entityId: product.id,
      locale: 'en',
      status: 'in_progress',
      message: '진행 중',
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const translationService = createTranslationService();
    const llmClient = createLlmClient(async () => {
      throw new Error('LLM down');
    });
    const mockRepo = {
      createJob: vi.fn(),
      findJobById: vi.fn(),
      updateJobStatus: vi.fn(),
      claimJobStatus: vi.fn().mockResolvedValueOnce(claimed).mockResolvedValueOnce(null),
      findJobs: vi.fn(),
    };

    const service = new TranslationJobService(
      createProductUseCase(product),
      createMagazineUseCase(),
      translationService as unknown as TranslationService,
      llmClient as unknown as LlmClient,
      createProductFeatureUseCase(),
      createProductFeaturesUseCase(),
      mockRepo as never
    );

    await service.executeProductTranslationJob('job-terminal', product.id);

    expect(mockRepo.claimJobStatus).toHaveBeenCalledTimes(2);
    expect(mockRepo.claimJobStatus).toHaveBeenNthCalledWith(
      2,
      'job-terminal',
      ['pending', 'in_progress'],
      'failed',
      {
        error: expect.stringContaining('LLM down'),
        message: '상품 번역에 실패했습니다.',
      }
    );
    expect(mockRepo.updateJobStatus).not.toHaveBeenCalledWith('job-terminal', 'failed', expect.anything());
  });
});
