// @vitest-environment node
import 'reflect-metadata';
import { Product, ProductFeature } from '@darun/products-domain';
import { TranslationService, type TranslationRepository } from '@darun/translation-domain';
import type * as GraphQL from 'graphql';
import { buildSchemaSync } from 'type-graphql';
import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import {
  ProductWithFeaturesOnProductFeatureListDocument,
  SearchProductsOnSearchProductListDocument,
} from '../../../../__generated__/graphql';
import { computeSourceHash } from '../../../../translation/domain/src/utils/sourceHash';
import { FeatureQueryResolver } from '../Feature.query.resolver';
import { ProductQueryResolver } from '../Product.query.resolver';

const { execute, validate } = createRequire(`${process.cwd()}/package.json`)('graphql') as typeof GraphQL;

function fixture() {
  const products = Array.from(
    { length: 12 },
    (_, index) =>
      new Product({
        id: `p${index}`,
        slug: `product-${index}`,
        name: `상품 ${index}`,
        summary: `요약 ${index}`,
        logoUrl: `/logo-${index}.svg`,
      })
  );
  const features = products.flatMap(product =>
    Array.from(
      { length: 20 },
      (_, index) =>
        new ProductFeature({
          id: `${product.id}-f${index}`,
          productId: product.id,
          name: `기능 ${index}`,
          summary: `기능 요약 ${index}`,
          emoji: '🔎',
        })
    )
  );
  const translations = [...products, ...features].flatMap(entity =>
    (['name', 'summary'] as const).map(field => ({
      id: `${entity.id}:${field}`,
      entityType: entity instanceof Product ? 'Product' : 'ProductFeature',
      entityId: entity.id,
      locale: 'en',
      field,
      value: `English ${field} ${entity.id}`,
      sourceHash: computeSourceHash(entity[field]!, field),
      createdAt: new Date(0),
      updatedAt: new Date(0),
    }))
  );
  const findOne = vi.fn<TranslationRepository['findOne']>().mockImplementation(async params => {
    return translations.find(row => row.entityId === params.entityId && row.field === params.field) ?? null;
  });
  const findMany = vi.fn<TranslationRepository['findMany']>().mockImplementation(async ({ entities }) => {
    return translations.filter(row =>
      entities.some(entity => entity.entityId === row.entityId && entity.field === row.field)
    );
  });
  const translationRepository: TranslationRepository = {
    findOne,
    findMany,
    findByEntity: vi.fn(),
    upsert: vi.fn(),
    upsertMany: vi.fn(),
  };
  const search = vi.fn().mockResolvedValue(products.map(({ id }) => ({ id })));
  const getFeatures = vi
    .fn()
    .mockImplementation(async ({ productId }: { productId: string }) =>
      features.filter(feature => feature.productId === productId)
    );
  const getPublishedProduct = vi
    .fn()
    .mockImplementation(async ({ slug }: { slug?: string }) =>
      slug ? products.find(product => product.slug === slug) : products
    );
  const unused = undefined!;
  const productResolver = new ProductQueryResolver(
    unused,
    unused,
    unused,
    unused,
    { execute: getPublishedProduct } as never,
    unused,
    {
      execute: vi.fn().mockResolvedValue({ tags: [{ id: 't1', name: '생산성' }] }),
    } as never,
    unused,
    unused,
    { execute: getFeatures } as never,
    unused,
    { execute: search } as never,
    unused,
    unused,
    unused,
    new TranslationService(translationRepository),
    unused,
    unused
  );
  const featureResolver = new FeatureQueryResolver({ execute: vi.fn().mockResolvedValue([]) } as never, unused);
  const schema = buildSchemaSync({
    resolvers: [ProductQueryResolver, FeatureQueryResolver],
    authChecker: () => true,
    container: {
      get: target => (target === ProductQueryResolver ? productResolver : featureResolver),
    },
  });
  return {
    getFeatures,
    findOne,
    search,
    getPublishedProduct,
    run: (document: GraphQL.DocumentNode, variableValues: Record<string, string>) => {
      expect(validate(schema, document)).toEqual([]);
      return execute({ schema, document, variableValues });
    },
  };
}

describe('검색 카드의 기능 selection', () => {
  it.each(['ko', 'en'])('%s 검색은 카드 데이터만 반환하고 기능 읽기·번역을 실행하지 않는다', async locale => {
    const { run, getFeatures, findOne, search, getPublishedProduct } = fixture();
    const result = await run(SearchProductsOnSearchProductListDocument, {
      query: '기능 검색',
      locale,
    });

    expect(result.errors).toBeUndefined();
    expect(getFeatures).not.toHaveBeenCalled();
    expect(findOne).not.toHaveBeenCalled();
    expect(search).toHaveBeenCalledExactlyOnceWith({ query: '기능 검색' });
    expect(getPublishedProduct).toHaveBeenCalledExactlyOnceWith({
      ids: Array.from({ length: 12 }, (_, index) => `p${index}`),
    });
    expect(result.data?.searchProducts).toEqual(
      Array.from({ length: 12 }, (_, index) => ({
        id: `p${index}`,
        slug: `product-${index}`,
        name: locale === 'ko' ? `상품 ${index}` : `English name p${index}`,
        summary: locale === 'ko' ? `요약 ${index}` : `English summary p${index}`,
        logoUrl: `/logo-${index}.svg`,
        tags: [{ id: 't1', name: '생산성' }],
      }))
    );
  });

  it.each(['ko', 'en'])('%s 상세는 독립 기능 문서로 기능과 번역을 계속 조회한다', async locale => {
    const { run, getFeatures, findOne, search } = fixture();
    const result = await run(ProductWithFeaturesOnProductFeatureListDocument, { slug: 'product-7', locale });

    expect(result.errors).toBeUndefined();
    expect(search).not.toHaveBeenCalled();
    expect(getFeatures).toHaveBeenCalledExactlyOnceWith({ productId: 'p7' });
    expect(findOne).toHaveBeenCalledTimes(locale === 'ko' ? 0 : 40);
    expect(result.data?.productBySlug).toEqual({
      id: 'p7',
      features: Array.from({ length: 20 }, (_, index) => ({
        id: `p7-f${index}`,
        name: locale === 'ko' ? `기능 ${index}` : `English name p7-f${index}`,
        summary: locale === 'ko' ? `기능 요약 ${index}` : `English summary p7-f${index}`,
        emoji: '🔎',
        screenshots: [],
      })),
    });
  });
});
