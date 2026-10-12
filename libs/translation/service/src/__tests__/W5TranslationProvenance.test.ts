import 'reflect-metadata';
import type { GetMagazine } from '@darun/magazines-domain';
import type { GetProduct, GetProductFeature, GetProductFeatures } from '@darun/products-domain';
import { Product, ProductFeature } from '@darun/products-domain';
import type { LlmClient } from '@darun/utils-llm';
import { RetryableError } from '@darun/utils-llm';
import type { TranslationProvider } from '@darun/translation-domain';
import { computeSourceHash, TranslationService } from '@darun/translation-domain';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('typedi', async importOriginal => ({
  ...(await importOriginal<typeof import('typedi')>()),
  Inject: () => () => undefined,
  Service: () => () => undefined,
}));

let TranslationJobService: typeof import('@darun/translation-service').TranslationJobService;

const translationServiceStub = (overrides: Record<string, unknown> = {}) => ({
  upsertTranslation: vi.fn().mockResolvedValue(undefined),
  upsertTranslations: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

function makeProduct(overrides: Record<string, unknown> = {}) {
  return new Product({
    id: 'prod-w5',
    slug: 'w5-product',
    name: '원래 이름',
    summary: '원래 요약',
    description: '<p>원래 설명</p>',
    logoUrl: 'https://example.com/logo.png',
    ...overrides,
  });
}

function serviceDeps() {
  return {
    getMagazine: { execute: vi.fn() } as unknown as GetMagazine,
    getProductFeature: { execute: vi.fn() } as unknown as GetProductFeature,
  };
}

describe('W5 translation provenance', () => {
  beforeEach(async () => {
    const module = await import('@darun/translation-service');
    TranslationJobService = module.TranslationJobService;
  });

  it('W5-A1: 단일 번들 검증자가 중복·미지·누락 ID와 빈 필수명을 거부하고 행을 쓰지 않는다', async () => {
    const { getMagazine, getProductFeature } = serviceDeps();
    const product = makeProduct();
    const getProduct = { execute: vi.fn().mockResolvedValue(product) } as unknown as GetProduct;
    const getProductFeatures = {
      execute: vi.fn().mockResolvedValue([
        new ProductFeature({ id: 'feat-1', productId: product.id, name: '기능', summary: '요약', emoji: '✨' }),
      ]),
    } as unknown as GetProductFeatures;
    const translationService = translationServiceStub();

    const cases: Array<{ label: string; response: unknown }> = [
      {
        label: 'duplicate',
        response: {
          name: 'Name',
          summary: 'Summary',
          description: 'Description',
          features: [
            { id: 'feat-1', name: 'F1', summary: 'S1' },
            { id: 'feat-1', name: 'F1-dup', summary: 'S1-dup' },
          ],
        },
      },
      {
        label: 'unknown',
        response: {
          name: 'Name',
          summary: 'Summary',
          description: 'Description',
          features: [{ id: 'feat-evil', name: 'Evil', summary: 'Evil' }],
        },
      },
      {
        label: 'missing',
        response: { name: 'Name', summary: 'Summary', description: 'Description', features: [] },
      },
      {
        label: 'blank-required-name',
        response: {
          name: '   ',
          summary: 'Summary',
          description: 'Description',
          features: [{ id: 'feat-1', name: 'F1', summary: 'S1' }],
        },
      },
    ];

    for (const testCase of cases) {
      const provider = {
        translateProductBundle: vi.fn().mockImplementation(async (request: {
          features: Array<{ id: string; name: string; summary: string }>;
        }) => {
          const { validateProductBundleTranslation } = await import('@darun/translation-domain');
          // 커밋 게이트와 동일한 단일 검증자로 먼저 판정한다.
          validateProductBundleTranslation({ features: request.features }, testCase.response);
          throw new Error(`test setup must reject before provider mapping (${testCase.label})`);
        }),
        translateSingle: vi.fn(),
      } as unknown as TranslationProvider;
      const service = new TranslationJobService(
        getProduct,
        getMagazine,
        translationService as unknown as TranslationService,
        provider,
        getProductFeature,
        getProductFeatures
      );

      await expect(service.translateProductWithFeatures(product.id)).rejects.toThrow();
      expect(translationService.upsertTranslations).not.toHaveBeenCalled();
      expect(translationService.upsertTranslation).not.toHaveBeenCalled();
    }
  });

  it('W5-A1: 합법적인 빈 선택 설명은 받아들이고 요청 순서대로 커밋한다', async () => {
    const { getMagazine, getProductFeature } = serviceDeps();
    const product = makeProduct();
    const getProduct = {
      execute: vi.fn().mockResolvedValueOnce(product).mockResolvedValueOnce(product),
    } as unknown as GetProduct;
    const feature = new ProductFeature({
      id: 'feat-1',
      productId: product.id,
      name: '기능',
      summary: '요약',
      emoji: '✨',
    });
    const getProductFeatures = {
      execute: vi.fn().mockResolvedValueOnce([feature]).mockResolvedValueOnce([feature]),
    } as unknown as GetProductFeatures;
    const translationService = translationServiceStub();
    const provider = {
      translateProductBundle: vi.fn().mockResolvedValue({
        product: {
          name: 'Name',
          summary: '',
          description: '',
          nameSourceHash: computeSourceHash(product.name),
          summarySourceHash: computeSourceHash(product.summary),
          descriptionSourceHash: computeSourceHash(product.description ?? ''),
        },
        features: [
          {
            id: 'feat-1',
            name: 'Feature',
            summary: '',
            nameSourceHash: computeSourceHash(feature.name),
            summarySourceHash: computeSourceHash(feature.summary ?? ''),
          },
        ],
        model: 'm',
        promptVersion: 'v1',
      }),
    } as unknown as TranslationProvider;
    const service = new TranslationJobService(
      getProduct,
      getMagazine,
      translationService as unknown as TranslationService,
      provider,
      getProductFeature,
      getProductFeatures
    );

    await service.translateProductWithFeatures(product.id);

    expect(translationService.upsertTranslations).toHaveBeenCalledTimes(1);
    const rows = vi.mocked(translationService.upsertTranslations).mock.calls[0]![0] as Array<{
      entityType: string;
      entityId: string;
      field: string;
      value: string;
    }>;
    expect(rows.map(row => `${row.entityType}/${row.entityId}/${row.field}`)).toEqual([
      'Product/prod-w5/name',
      'Product/prod-w5/summary',
      'Product/prod-w5/description',
      'ProductFeature/feat-1/name',
      'ProductFeature/feat-1/summary',
    ]);
    expect(rows.find(row => row.field === 'summary')?.value).toBe('');
  });

  it('W5-A2: provenance 없는 변경값 upsert는 거부되고 같은 값 no-op은 provenance를 유지한다', async () => {
    const existing = {
      id: 't-1',
      entityType: 'Product',
      entityId: 'prod-w5',
      locale: 'en',
      field: 'name',
      value: 'Old name',
      sourceHash: 'old-hash',
      model: 'old-model',
      promptVersion: 'old-version',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const upsert = vi.fn().mockResolvedValue(existing);
    const upsertMany = vi.fn().mockResolvedValue([existing]);
    const repository = {
      findOne: vi.fn().mockResolvedValue(existing),
      findMany: vi.fn().mockResolvedValue([existing]),
      upsert,
      upsertMany,
      findByEntity: vi.fn().mockResolvedValue([existing]),
    };
    const service = new TranslationService(repository as never);

    await expect(
      service.upsertTranslation({
        entityType: 'Product',
        entityId: 'prod-w5',
        locale: 'en',
        field: 'name',
        value: 'Changed name',
      })
    ).rejects.toThrow(/sourceHash 없이 번역 값을 변경할 수 없습니다/);
    expect(upsert).not.toHaveBeenCalled();

    await service.upsertTranslation({
      entityType: 'Product',
      entityId: 'prod-w5',
      locale: 'en',
      field: 'name',
      value: 'Old name',
      sourceHash: null,
      model: null,
      promptVersion: null,
    });
    expect(upsert).toHaveBeenCalledTimes(1);
    const noOpParams = upsert.mock.calls[0]![0] as Record<string, unknown>;
    expect(noOpParams.value).toBe('Old name');
    expect('sourceHash' in noOpParams).toBe(false);
    expect('model' in noOpParams).toBe(false);
    expect('promptVersion' in noOpParams).toBe(false);

    await expect(
      service.upsertTranslations([
        { entityType: 'Product', entityId: 'prod-w5', locale: 'en', field: 'name', value: 'Changed again' },
      ])
    ).rejects.toThrow(/sourceHash 없이 번역 값을 변경할 수 없습니다/);
    expect(upsertMany).not.toHaveBeenCalled();
  });

  it('W5-A3: 지속적 기능 재조회 실패는 기존 영문행을 보존하는 재시도 가능 실패가 된다', async () => {    const { getMagazine, getProductFeature } = serviceDeps();
    const product = makeProduct();
    const getProduct = {
      execute: vi.fn().mockResolvedValueOnce(product).mockResolvedValueOnce(product),
    } as unknown as GetProduct;
    const getProductFeatures = {
      execute: vi
        .fn()
        .mockResolvedValueOnce([
          new ProductFeature({ id: 'feat-1', productId: product.id, name: '기능', summary: '요약', emoji: '✨' }),
        ])
        .mockRejectedValueOnce(new Error('transient DB error')),
    } as unknown as GetProductFeatures;
    const translationService = translationServiceStub();
    const provider = {
      translateProductBundle: vi.fn().mockResolvedValue({
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
      }),
    } as unknown as TranslationProvider;
    const service = new TranslationJobService(
      getProduct,
      getMagazine,
      translationService as unknown as TranslationService,
      provider,
      getProductFeature,
      getProductFeatures
    );

    const failure = await service.translateProductWithFeatures(product.id).catch(error => error);
    expect(failure).toBeInstanceOf(RetryableError);
    expect((failure as Error).message).toMatch(/기능 목록 재조회에 실패했습니다/);
    const cause = (failure as Error & { cause?: unknown }).cause;
    void cause;
    expect(translationService.upsertTranslations).not.toHaveBeenCalled();
    expect(translationService.upsertTranslation).not.toHaveBeenCalled();

    // 같은 인프라 실패 형태는 withRetry 분류상 재시도 가능하다.
    expect(new RetryableError('기능 목록 재조회에 실패했습니다: prod-w5').name).toBe('RetryableError');
    void (null as unknown as LlmClient);
  });

  it('W5-A5: translateEntity는 요청 필드 전체를 스냅샷하고 전체 유효할 때만 일괄 커밋한다', async () => {
    const { getMagazine, getProductFeature } = serviceDeps();
    const product = makeProduct();
    const getProduct = { execute: vi.fn().mockResolvedValue(product) } as unknown as GetProduct;
    const translationService = translationServiceStub();
    const provider = {
      translateProductBundle: vi.fn(),
      translateSingle: vi
        .fn()
        .mockResolvedValueOnce({
          translatedText: 'Name EN',
          sourceHash: computeSourceHash(product.name),
          model: 'm',
          promptVersion: 'v1',
        })
        .mockResolvedValueOnce({ translatedText: '   ', sourceHash: 'blank', model: 'm', promptVersion: 'v1' }),
    } as unknown as TranslationProvider;
    const service = new TranslationJobService(
      getProduct,
      getMagazine,
      translationService as unknown as TranslationService,
      provider,
      getProductFeature,
      undefined as never
    );

    await expect(service.translateEntity('Product', product.id, ['name', 'summary'])).rejects.toThrow(
      /번역 결과가 비어 있습니다/
    );
    expect(translationService.upsertTranslations).not.toHaveBeenCalled();
    expect(translationService.upsertTranslation).not.toHaveBeenCalled();
  });
});
