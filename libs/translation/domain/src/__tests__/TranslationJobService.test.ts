import 'reflect-metadata';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Magazine } from '@darun/magazines-domain';
import { Product } from '@darun/products-domain';
import type { GetMagazine } from '@darun/magazines-domain';
import type { GetProduct } from '@darun/products-domain';
import type { LlmClient } from '@darun/utils-llm';
import type { TranslationService } from '../services/TranslationService';

vi.mock('typedi', async importOriginal => ({
  ...(await importOriginal<typeof import('typedi')>()),
  Inject: () => () => undefined,
  Service: () => () => undefined,
}));

let TranslationJobService: typeof import('@darun/translation-service').TranslationJobService;
let TRANSLATABLE_FIELD_METADATA: typeof import('@darun/translation-service').TRANSLATABLE_FIELD_METADATA;

type UpsertParams = Parameters<TranslationService['upsertTranslation']>[0];

const createTranslationService = () => ({
  upsertTranslation: vi.fn<TranslationService['upsertTranslation']>().mockResolvedValue(undefined),
} satisfies Pick<TranslationService, 'upsertTranslation'>);

const createLlmClient = () => ({
  completion: vi.fn().mockImplementation(async (_model: string, messages: Array<{ content: string }>) => ({
    content: `en:${messages[0]?.content.split(': ').pop()}`,
  })),
});

const createProductUseCase = (product?: Product) =>
  ({ execute: vi.fn<GetProduct['execute']>().mockResolvedValue(product ?? null) }) as unknown as GetProduct;

const createMagazineUseCase = (magazine?: Magazine) =>
  ({ execute: vi.fn<GetMagazine['execute']>().mockResolvedValue(magazine ?? null) }) as unknown as GetMagazine;

const createService = ({ product, magazine }: { product?: Product; magazine?: Magazine }) => {
  const translationService = createTranslationService();
  const llmClient = createLlmClient();

  return {
    service: new TranslationJobService(
      createProductUseCase(product),
      createMagazineUseCase(magazine),
      translationService as unknown as TranslationService,
      llmClient as unknown as LlmClient
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
    TRANSLATABLE_FIELD_METADATA.Product.fields.tagline = { property: 'tagline' };
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
});
