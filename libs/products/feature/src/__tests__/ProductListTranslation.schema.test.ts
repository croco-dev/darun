// @vitest-environment node
import 'reflect-metadata';
import { Product } from '@darun/products-domain';
import { TranslationService, type TranslationRepository } from '@darun/translation-domain';
import type * as GraphQL from 'graphql';
import { buildSchemaSync } from 'type-graphql';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import {
  RankedProductsOnRankedProductListDocument,
  RecentProductsOnRecentProductListDocument,
} from '../../../../__generated__/graphql';
import * as sourceHash from '../../../../translation/domain/src/utils/sourceHash';
import { ProductQueryResolver } from '../Product.query.resolver';

const { execute, graphql } = createRequire(`${process.cwd()}/package.json`)('graphql') as typeof GraphQL;

function fixture() {
  const products = Array.from(
    { length: 24 },
    (_, index) =>
      new Product({
        id: `p${index}`,
        name: `이름 ${index}`,
        slug: `product-${index}`,
        summary: `요약 ${index}`,
        description: `본문 ${index} ${'긴 본문 '.repeat(10000)}`,
        logoUrl: '',
      })
  );
  const rows = products.flatMap((product, index) =>
    (['name', 'summary', 'description'] as const).map(field => ({
      id: `${product.id}:${field}`,
      entityType: 'Product',
      entityId: product.id,
      locale: 'en',
      field,
      value: `English ${field} ${index}`,
      // One stale body and one absent body distinguish freshness fallback from translation.
      sourceHash: sourceHash.computeSourceHash(index === 1 ? 'old' : product[field]!, field),
      createdAt: new Date(0),
      updatedAt: new Date(0),
    }))
  );
  const findMany = vi
    .fn<TranslationRepository['findMany']>()
    .mockImplementation(async ({ entities }) =>
      rows.filter(
        row =>
          entities.some(entity => entity.entityId === row.entityId && entity.field === row.field) &&
          !(row.entityId === 'p2' && row.field === 'description')
      )
    );
  const translationRepository: TranslationRepository = {
    findMany,
    findOne: vi.fn(),
    findByEntity: vi.fn(),
    upsert: vi.fn(),
    upsertMany: vi.fn(),
  };
  const unused = undefined!;
  const resolver = new ProductQueryResolver(
    { execute: vi.fn().mockResolvedValue(products) } as never,
    { execute: vi.fn().mockResolvedValue(products) } as never,
    unused,
    unused,
    { execute: vi.fn().mockResolvedValue(products[0]) } as never,
    unused,
    { execute: vi.fn().mockResolvedValue(null) } as never,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    { execute: vi.fn().mockResolvedValue(42) } as never,
    unused,
    new TranslationService(translationRepository),
    unused,
    unused
  );
  const schema = buildSchemaSync({
    resolvers: [ProductQueryResolver],
    authChecker: () => true,
    container: { get: () => resolver },
  });
  const hash = vi.spyOn(sourceHash, 'computeSourceHash');
  return {
    products,
    rows,
    findMany,
    hash,
    run: (source: string, variableValues?: Record<string, unknown>) => graphql({ schema, source, variableValues }),
    runCard: (document: GraphQL.DocumentNode, locale: string) =>
      execute({ schema, document, variableValues: { locale } }),
  };
}

afterEach(() => vi.restoreAllMocks());

describe('상품 카드 목록의 선택적 본문 번역', () => {
  it.each([
    ['recentProducts', RecentProductsOnRecentProductListDocument],
    ['rankedProducts', RankedProductsOnRankedProductListDocument],
  ] as const)('실제 %s 카드 문서는 본문 번역을 읽거나 hash하지 않는다', async (field, document) => {
    const { runCard, findMany, hash, products } = fixture();
    const result = await runCard(document, 'en');
    expect(result.errors).toBeUndefined();
    const cards = result.data?.[field] as Array<{
      id: string;
      name: string;
      summary: string;
      slug: string;
    }>;
    expect(cards).toHaveLength(24);
    expect(cards[0]).toMatchObject({
      id: 'p0',
      name: 'English name 0',
      summary: 'English summary 0',
      slug: 'product-0',
    });
    expect(cards.map(card => card.id)).toEqual(Array.from({ length: 24 }, (_, index) => `p${index}`));
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany.mock.calls[0][0].entities).toHaveLength(48);
    expect(findMany.mock.calls[0][0].entities.some(entry => entry.field === 'description')).toBe(false);
    expect(hash.mock.calls.some(([, field]) => field === 'description')).toBe(false);
    expect(hash).toHaveBeenCalledTimes(48);
    const korean = await runCard(document, 'ko');
    expect(korean.errors).toBeUndefined();
    expect(korean.data?.[field]).toEqual(
      products.map(product => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        logoUrl: product.logoUrl,
        summary: product.summary,
        tags: [],
        ...(field === 'rankedProducts' ? { voteCount: 42 } : {}),
      }))
    );
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it.each(['recentProducts', 'rankedProducts'])('alias와 중첩 fragment의 %s 본문을 한 번에 번역한다', async field => {
    const { run, products, findMany } = fixture();
    const result = await run(`{
      list: ${field}(first: 24, locale: "en") { id ...Body }
    }
    fragment Body on Product { ... on Product { text: description } }`);
    expect(result.errors).toBeUndefined();
    const list = result.data?.list as Array<{ text: string }>;
    expect(list[0].text).toBe('English description 0');
    expect(list[1].text).toBe(products[1].description);
    expect(list[2].text).toBe(products[2].description);
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany.mock.calls[0][0].entities.filter(entry => entry.field === 'description')).toHaveLength(24);
  });

  it.each([
    'description @skip(if: $skip)',
    '...Body @include(if: $include)',
    '... on Product @skip(if: $skip) { description }',
  ])('실행에서 제외된 본문은 번역하지 않는다: %s', async selection => {
    const { run, findMany } = fixture();
    const variable = selection.includes('$skip') ? '$skip: Boolean! = true' : '$include: Boolean! = false';
    const result = await run(`query(${variable}) {
      recentProducts(first: 24, locale: "en") { id ${selection} }
    } ${selection.includes('...Body') ? 'fragment Body on Product { description }' : ''}`);
    expect(result.errors).toBeUndefined();
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(
      findMany.mock.calls.flatMap(([params]) => params.entities).some(entry => entry.field === 'description')
    ).toBe(false);
  });

  it('동일 필드의 합쳐진 selection과 변수 변경을 반영하며 요청 사이에 번역을 캐시하지 않는다', async () => {
    const { run, rows, findMany } = fixture();
    const source = `query($include: Boolean!) {
      recentProducts(first: 24, locale: "en") { id }
      recentProducts(first: 24, locale: "en") { text: description @include(if: $include) }
    }`;
    expect((await run(source, { include: false })).errors).toBeUndefined();
    expect(findMany.mock.calls[0][0].entities.some(entry => entry.field === 'description')).toBe(false);
    rows.find(row => row.id === 'p0:description')!.value = 'Updated English body';
    const result = await run(source, { include: true });
    expect(result.errors).toBeUndefined();
    expect((result.data?.recentProducts as Array<unknown>)[0]).toEqual({
      id: 'p0',
      text: 'Updated English body',
    });
    expect(findMany).toHaveBeenCalledTimes(2);
  });

  it('한국어와 번역 조회 실패 및 상세 본문의 기존 fallback을 유지한다', async () => {
    const { run, products, findMany, hash } = fixture();
    const korean = await run('{ rankedProducts(first: 24, locale: "ko") { name description } }');
    expect(korean.errors).toBeUndefined();
    expect(korean.data?.rankedProducts).toEqual(products.map(({ name, description }) => ({ name, description })));
    expect(findMany).not.toHaveBeenCalled();
    expect(hash).not.toHaveBeenCalled();
    const detail = await run('{ productBySlug(slug: "product-0", locale: "en") { description } }');
    expect(detail.errors).toBeUndefined();
    expect(detail.data?.productBySlug).toEqual({
      description: 'English description 0',
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    findMany.mockRejectedValueOnce(new Error('translation unavailable'));
    const failed = await run('{ recentProducts(first: 24, locale: "en") { name description } }');
    expect(failed.errors).toBeUndefined();
    expect(failed.data?.recentProducts).toEqual(products.map(({ name, description }) => ({ name, description })));
    expect(log).toHaveBeenCalled();
  });
});
