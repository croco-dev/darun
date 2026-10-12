import 'reflect-metadata';
import type { GetMagazine } from '@darun/magazines-domain';
import type { GetProduct, GetProductFeature, GetProductFeatures } from '@darun/products-domain';
import type { LlmClient } from '@darun/utils-llm';
import { describe, expect, it, vi } from 'vitest';
import type { TranslationService } from '../services/TranslationService';

vi.mock('typedi', async importOriginal => ({
  ...(await importOriginal<typeof import('typedi')>()),
  Inject: () => () => undefined,
  Service: () => () => undefined,
}));

let TranslationJobService: typeof import('@darun/translation-service').TranslationJobService;

const translationServiceStub = () => ({
  upsertTranslation: vi.fn().mockResolvedValue(undefined),
});

describe('W4 job lease recovery: TranslationJobService', () => {
  it('W4-A1: lease fence rejects stale translation-row writes before upsert', async () => {
    const module = await import('@darun/translation-service');
    TranslationJobService = module.TranslationJobService;
    const product = {
      id: 'prod-1',
      name: '상품',
      summary: '요약',
      description: '설명',
    };
    const getProduct = { execute: vi.fn().mockResolvedValue(product) } as unknown as GetProduct;
    const getMagazine = { execute: vi.fn() } as unknown as GetMagazine;
    const translationService = translationServiceStub();
    const provider = {
      translateProductBundle: vi.fn().mockResolvedValue({
        product: {
          name: 'Product',
          summary: 'Summary',
          description: 'Description',
          nameSourceHash: 'h1',
          summarySourceHash: 'h2',
          descriptionSourceHash: 'h3',
        },
        features: [],
        model: 'm',
        promptVersion: 'v1',
      }),
    };
    // 현재 lease는 lease-B인데 구 attempt(lease-A)가 쓰기를 시도한다.
    const repository = {
      findJobById: vi.fn().mockResolvedValue({ id: 'job-1', leaseToken: 'lease-B' }),
      completeJobLease: vi.fn(),
    };
    const service = new TranslationJobService(
      getProduct,
      getMagazine,
      translationService as unknown as TranslationService,
      provider as never,
      { execute: vi.fn() } as unknown as GetProductFeature,
      { execute: vi.fn().mockResolvedValue([]) } as unknown as GetProductFeatures,
      repository as never
    );

    const result = await service.translateProductWithFeatures('prod-1', 'job-1', { leaseToken: 'lease-A' });
    // lease 상실은 명시적 leaseLost 신호로 끝나 row 쓰기가 없다.
    // 외부는 stale/leaseLost를 보고 completed 확정을 건너뛴다(F-A1).
    expect(result).toEqual({ productId: 'prod-1', leaseLost: true });
    expect(translationService.upsertTranslation).not.toHaveBeenCalled();
    expect(provider.translateProductBundle).toHaveBeenCalled();
  });

  it('W4-A2/A3: pending jobs are rediscovered and queue failure reports queued=false', async () => {
    const module = await import('@darun/translation-service');
    TranslationJobService = module.TranslationJobService;
    const pending = {
      id: 'job-pending',
      entityType: 'Product',
      entityId: 'prod-1',
      status: 'pending',
    };
    const repository = {
      createJob: vi.fn().mockResolvedValue(pending),
      findRecoverableJobs: vi.fn().mockResolvedValue([pending]),
    };
    const queue = { sendJob: vi.fn().mockRejectedValue(new Error('SQS down')) };
    const service = new TranslationJobService(
      { execute: vi.fn().mockResolvedValue({ id: 'prod-1' }) } as unknown as GetProduct,
      { execute: vi.fn() } as unknown as GetMagazine,
      translationServiceStub() as unknown as TranslationService,
      { completion: vi.fn() } as unknown as LlmClient,
      { execute: vi.fn() } as unknown as GetProductFeature,
      { execute: vi.fn() } as unknown as GetProductFeatures,
      repository as never,
      queue as never
    );

    const requested = await service.requestProductTranslationJob('prod-1');
    expect(requested.queued).toBe(false);
    expect(requested.status).toBe('pending');

    const recovered = await service.recoverInterruptedJobs({ now: new Date() });
    // 전송이 계속 실패해도 pending으로 남고, 다음 tick이 다시 시도한다.
    expect(recovered).toEqual({ recovered: 1, queued: 0 });
    expect(queue.sendJob).toHaveBeenCalledTimes(2);
  });
});
