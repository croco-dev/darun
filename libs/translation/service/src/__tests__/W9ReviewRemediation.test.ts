import 'reflect-metadata';
import type { GetMagazine } from '@darun/magazines-domain';
import type { GetProduct, GetProductFeature, GetProductFeatures, ProductFeature } from '@darun/products-domain';
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
    id: 'prod-w9',
    slug: 'w9-product',
    name: '원래 이름',
    summary: '원래 요약',
    description: '<p>원래 설명</p>',
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

describe('W9 review remediation: translation lease and boundary guards', () => {
  it('F-A1: source-changed translation ends superseded and the outer worker cannot overwrite it to completed', async () => {
    const module = await import('@darun/translation-service');
    TranslationJobService = module.TranslationJobService;
    const product = productFixture();
    const staleProduct = new Product({
      id: product.id,
      slug: product.slug,
      name: '수정된 이름',
      summary: product.summary,
      description: product.description ?? undefined,
      logoUrl: product.logoUrl,
    });
    const getProduct = {
      execute: vi.fn().mockResolvedValueOnce(product).mockResolvedValue(staleProduct),
    } as unknown as GetProduct;
    const translationService = translationServiceStub();
    const provider = {
      translateProductBundle: vi.fn().mockResolvedValue(bundleFixture()),
    };
    // inner stale 확정 이후 outer 완료가 같은 lease로 들어와도
    // 상태 가드(in_progress 아님)로 거부되는 DB 조건을 흉내 낸다.
    const store = new Map<string, { status: string; leaseToken: string | null }>();
    store.set('job-w9-f1', { status: 'in_progress', leaseToken: 'lease-w9' });
    const repository = {
      findJobById: vi.fn(async (id: string) => ({ id, leaseToken: 'lease-w9' })),
      completeJobLease: vi.fn(
        async (jobId: string, leaseToken: string, nextStatus: string, options?: Record<string, unknown>) => {
          const current = store.get(jobId)!;
          if (current.leaseToken !== leaseToken || current.status !== 'in_progress') {
            return null;
          }
          const next = { status: nextStatus, leaseToken };
          store.set(jobId, next);
          return { id: jobId, ...next, ...options };
        }
      ),
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

    const inner = await service.translateProductWithFeatures(product.id, 'job-w9-f1', {
      leaseToken: 'lease-w9',
    });
    expect(inner.stale).toBe(true);
    expect(store.get('job-w9-f1')?.status).toBe('superseded');
    expect(translationService.upsertTranslations).not.toHaveBeenCalled();
    expect(translationService.upsertTranslation).not.toHaveBeenCalled();

    // 늦은 outer completed는 상태 가드에 거부된다.
    const late = await repository.completeJobLease('job-w9-f1', 'lease-w9', 'completed', { message: 'late' });
    expect(late).toBeNull();
    expect(store.get('job-w9-f1')?.status).toBe('superseded');
  });

  it('F-A2: lost-lease translation attempts persist zero translation rows', async () => {
    const module = await import('@darun/translation-service');
    TranslationJobService = module.TranslationJobService;
    const product = productFixture();
    const getProduct = { execute: vi.fn().mockResolvedValue(product) } as unknown as GetProduct;
    const translationService = translationServiceStub();
    const provider = {
      translateProductBundle: vi.fn().mockResolvedValue(bundleFixture()),
    };
    // 현재 lease는 lease-B인데 구 attempt(lease-A)가 커밋 구간에 진입한다.
    const repository = {
      findJobById: vi.fn().mockResolvedValue({ id: 'job-w9-f2', leaseToken: 'lease-B', status: 'in_progress' }),
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

    const result = await service.translateProductWithFeatures(product.id, 'job-w9-f2', {
      leaseToken: 'lease-A',
    });
    expect(result.leaseLost).toBe(true);
    expect(translationService.upsertTranslations).not.toHaveBeenCalled();
    expect(translationService.upsertTranslation).not.toHaveBeenCalled();
    expect(repository.completeJobLease).not.toHaveBeenCalled();
    // 구 attempt는 쓰기 직전 초기 fence에서 거부되므로 커밋 가드까지 가지 않는다.
    expect(repository.findJobById).toHaveBeenCalledTimes(1);
  });

  it('F-A1 outer: stale inner result skips outer completion entirely', async () => {
    const module = await import('@darun/translation-service');
    TranslationJobService = module.TranslationJobService;
    const product = productFixture();
    const staleProduct = new Product({
      id: product.id,
      slug: product.slug,
      name: '수정된 이름',
      summary: product.summary,
      description: product.description ?? undefined,
      logoUrl: product.logoUrl,
    });
    const getProduct = {
      execute: vi
        .fn()
        .mockResolvedValueOnce(product)
        .mockResolvedValueOnce(staleProduct)
        .mockResolvedValue(staleProduct),
    } as unknown as GetProduct;
    const translationService = translationServiceStub();
    const provider = {
      translateProductBundle: vi.fn().mockResolvedValue(bundleFixture()),
    };
    const repository = {
      claimJobLease: vi.fn().mockResolvedValue({ id: 'job-w9-outer', leaseToken: 'lease-w9', status: 'in_progress' }),
      findJobById: vi.fn().mockResolvedValue({ id: 'job-w9-outer', leaseToken: 'lease-w9', status: 'superseded' }),
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

    await service.executeProductTranslationJob('job-w9-outer', product.id, { leaseToken: 'lease-w9' });
    expect(repository.completeJobLease).not.toHaveBeenCalledWith(
      'job-w9-outer',
      'lease-w9',
      'completed',
      expect.anything()
    );
    expect(translationService.upsertTranslations).not.toHaveBeenCalled();
    expect(translationService.upsertTranslation).not.toHaveBeenCalled();
    void (null as unknown as LlmClient);
    void (null as unknown as ProductFeature);
  });
});
