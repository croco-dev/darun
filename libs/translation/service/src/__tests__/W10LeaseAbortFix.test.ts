import 'reflect-metadata';
import type { GetMagazine } from '@darun/magazines-domain';
import type { GetProduct, GetProductFeature, GetProductFeatures } from '@darun/products-domain';
import { Product } from '@darun/products-domain';
import type { TranslationService } from '@darun/translation-domain';
import type { LlmClient } from '@darun/utils-llm';
import { describe, expect, it, vi } from 'vitest';

vi.mock('typedi', async importOriginal => ({
  ...(await importOriginal<typeof import('typedi')>()),
  Inject: () => () => undefined,
  Service: () => () => undefined,
}));

let TranslationJobService: typeof import('@darun/translation-service').TranslationJobService;

function translationServiceStub() {
  return {
    upsertTranslation: vi.fn().mockResolvedValue(undefined),
    upsertTranslations: vi.fn().mockResolvedValue(undefined),
  };
}

function productFixture() {
  return new Product({
    id: 'prod-w10',
    slug: 'w10-product',
    name: '이름',
    summary: '요약',
    description: '<p>설명</p>',
    logoUrl: 'https://example.com/logo.png',
  });
}

function bundleFixture() {
  return {
    product: {
      name: 'Name',
      summary: 'Summary',
      description: 'Description',
      nameSourceHash: 'h1',
      summarySourceHash: 'h2',
      descriptionSourceHash: 'h3',
    },
    features: [],
    model: 'm',
    promptVersion: 'v1',
  };
}

describe('W10 lease abort fix: translation worker', () => {
  it('B-A2: 부모 abort가 worker deadline으로 전파되어 staged 번역이 중단된다', async () => {
    const module = await import('@darun/translation-service');
    TranslationJobService = module.TranslationJobService;
    const product = productFixture();
    const getProduct = { execute: vi.fn().mockResolvedValue(product) } as unknown as GetProduct;
    const translationService = translationServiceStub();
    let observedSignal: AbortSignal | undefined;
    const provider = {
      translateProductBundle: vi.fn(async (request: { signal?: AbortSignal }) => {
        observedSignal = request.signal;
        // staged LLM 작업은 전달된 signal을 존중해 중단된다.
        await new Promise<void>((_, reject) => {
          const signal = request.signal;
          if (!signal) {
            return;
          }
          if (signal.aborted) {
            const aborted = new Error('작업이 중단되었습니다.');
            aborted.name = 'AbortError';
            reject(aborted);
            return;
          }
          signal.addEventListener(
            'abort',
            () => {
              const aborted = new Error('작업이 중단되었습니다.');
              aborted.name = 'AbortError';
              reject(aborted);
            },
            { once: true }
          );
        });
        return bundleFixture();
      }),
    };
    const repository = {
      claimJobLease: vi.fn().mockResolvedValue({ id: 'job-w10', leaseToken: 'lease-w10', status: 'in_progress' }),
      findJobById: vi.fn(),
      completeJobLease: vi.fn(),
    };
    const service = new TranslationJobService(
      getProduct,
      { execute: vi.fn() } as unknown as GetMagazine,
      translationService as unknown as TranslationService,
      provider as never,
      { execute: vi.fn() } as unknown as GetProductFeature,
      { execute: vi.fn().mockResolvedValue([]) } as unknown as GetProductFeatures,
      repository as never
    );
    const controller = new AbortController();
    const pending = service.executeProductTranslationJob('job-w10', product.id, {
      leaseToken: 'lease-w10',
      signal: controller.signal,
      stageBudgetMs: 5000,
    });
    controller.abort();
    await pending;
    expect(provider.translateProductBundle).toHaveBeenCalled();
    expect(observedSignal).toBeInstanceOf(AbortSignal);
    // 중단은 lease 만료·recovery에 맡기므로 확정 쓰기를 하지 않는다.
    expect(repository.completeJobLease).not.toHaveBeenCalled();
    expect(translationService.upsertTranslations).not.toHaveBeenCalled();
    expect(translationService.upsertTranslation).not.toHaveBeenCalled();
    void (null as unknown as LlmClient);
  });

  it('B-A3: 재시도는 failed만 조건부 전이로 pending 복귀하고 completed는 거부한다', async () => {
    const module = await import('@darun/translation-service');
    TranslationJobService = module.TranslationJobService;
    const product = productFixture();
    const claimJobStatus = vi.fn();
    const repository = {
      findJobById: vi.fn().mockResolvedValue({ id: 'job-done', status: 'completed' }),
      claimJobStatus,
      updateJobStatus: vi.fn(),
    };
    const service = new TranslationJobService(
      { execute: vi.fn().mockResolvedValue(product) } as unknown as GetProduct,
      { execute: vi.fn() } as unknown as GetMagazine,
      translationServiceStub() as unknown as TranslationService,
      { translateProductBundle: vi.fn(), translateSingle: vi.fn() } as never,
      undefined,
      undefined,
      repository as never,
      { sendJob: vi.fn() } as never
    );

    await expect(service.retryProductTranslationJob('job-done')).rejects.toThrow('재시도할 수 없는');
    expect(claimJobStatus).not.toHaveBeenCalled();
  });

  it('B-A4: 반복 발행 동기화는 활성 job을 재사용해 중복 job을 만들지 않는다', async () => {
    const module = await import('@darun/translation-service');
    TranslationJobService = module.TranslationJobService;
    const product = productFixture();
    const getProduct = { execute: vi.fn().mockResolvedValue(product) } as unknown as GetProduct;
    const provider = { translateProductBundle: vi.fn(), translateSingle: vi.fn() };
    const active = {
      id: 'job-active',
      entityType: 'Product',
      entityId: product.id,
      locale: 'en',
      status: 'pending',
      message: '번역 작업이 대기열에 등록되었습니다.',
    };
    const createJob = vi.fn().mockResolvedValue(active);
    const queue = { sendJob: vi.fn().mockResolvedValue(true) };
    const repository = {
      createJob,
      findJobs: vi.fn(),
    };
    const service = new TranslationJobService(
      getProduct,
      { execute: vi.fn() } as unknown as GetMagazine,
      translationServiceStub() as unknown as TranslationService,
      provider as never,
      { execute: vi.fn() } as unknown as GetProductFeature,
      { execute: vi.fn().mockResolvedValue([]) } as unknown as GetProductFeatures,
      repository as never,
      queue as never
    );

    const first = await service.requestProductTranslationJob(product.id);
    const second = await service.requestProductTranslationJob(product.id);
    expect(first.id).toBe('job-active');
    expect(second.id).toBe('job-active');
    expect(createJob).toHaveBeenCalledTimes(2);
    expect(queue.sendJob).toHaveBeenCalledTimes(2);
    expect(queue.sendJob).toHaveBeenCalledWith({
      jobId: 'job-active',
      entityType: 'Product',
      entityId: product.id,
    });
  });

  it('B-A4: in_progress 활성 job 재사용은 전송 없이 queued=true로 둔다', async () => {
    const module = await import('@darun/translation-service');
    TranslationJobService = module.TranslationJobService;
    const product = productFixture();
    const getProduct = { execute: vi.fn().mockResolvedValue(product) } as unknown as GetProduct;
    const provider = { translateProductBundle: vi.fn(), translateSingle: vi.fn() };
    const active = {
      id: 'job-running',
      entityType: 'Product',
      entityId: product.id,
      locale: 'en',
      status: 'in_progress',
      message: '진행 중',
    };
    const createJob = vi.fn().mockResolvedValue(active);
    const queue = { sendJob: vi.fn() };
    const repository = {
      createJob,
      findJobs: vi.fn(),
    };
    const service = new TranslationJobService(
      getProduct,
      { execute: vi.fn() } as unknown as GetMagazine,
      translationServiceStub() as unknown as TranslationService,
      provider as never,
      { execute: vi.fn() } as unknown as GetProductFeature,
      { execute: vi.fn().mockResolvedValue([]) } as unknown as GetProductFeatures,
      repository as never,
      queue as never
    );

    const result = await service.requestProductTranslationJob(product.id);
    expect(result.id).toBe('job-running');
    expect(result.queued).toBe(true);
    expect(createJob).toHaveBeenCalledOnce();
    expect(queue.sendJob).not.toHaveBeenCalled();
  });
});
