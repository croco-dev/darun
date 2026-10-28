// @vitest-environment node
import 'reflect-metadata';
import {
  Category,
  GetProductsByCategory,
  Product,
  type CategoryRepository,
  type ProductRepository,
} from '@darun/products-domain';
import type * as GraphQL from 'graphql';
import { buildSchemaSync } from 'type-graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { ProductQueryResolver } from '../Product.query.resolver';

const { graphql } = createRequire(`${process.cwd()}/package.json`)('graphql') as typeof GraphQL;

function fixture({ missing = false, empty = false } = {}) {
  const products = ['p3', 'p2', 'p1'].map(id => new Product({ id, name: id, slug: id, summary: id, logoUrl: '' }));
  const count = vi.fn().mockResolvedValue(empty ? 0 : 3);
  const list = vi.fn(async (_category: string, limit: number, afterId?: string) =>
    empty ? [] : products.filter(product => !afterId || product.id < afterId).slice(0, limit)
  );
  const repository = {
    findPublishedByCategoryId: list,
    countPublishedByCategoryId: count,
  } as unknown as ProductRepository;
  const categories = {
    findOneBySlug: vi.fn().mockResolvedValue(
      missing
        ? null
        : new Category({
            id: 'category-tools',
            slug: 'tools',
            labelKo: '도구',
            labelEn: 'Tools',
          })
    ),
  } as unknown as CategoryRepository;
  // Only category-list dependencies are used; other query methods are not executed.
  const unused = undefined!;
  const resolver = new ProductQueryResolver(
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    new GetProductsByCategory(repository, categories),
    unused,
    unused,
    repository
  );
  const schema = buildSchemaSync({
    resolvers: [ProductQueryResolver],
    authChecker: () => true,
    container: { get: () => resolver },
  });
  const execute = (source: string, variableValues?: Record<string, unknown>) =>
    graphql({ schema, source, variableValues });
  return { count, list, execute };
}

const pageFields = 'edges { node { id } cursor } pageInfo { hasNextPage hasPreviousPage startCursor endCursor }';

describe('카테고리 connection의 선택적 집계', () => {
  beforeEach(() => vi.stubEnv('CURSOR_SIGNATURE_SECRET', 'category-count-schema-test'));
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    `{ productsByCategory(slug: "tools", first: 2) { ${pageFields} } }`,
    `query($skip: Boolean!) { productsByCategory(slug: "tools", first: 2) { totalCount @skip(if: $skip) ${pageFields} } }`,
    `query($include: Boolean!) { productsByCategory(slug: "tools", first: 2) { ...Count @include(if: $include) ${pageFields} } } fragment Count on ProductConnection { totalCount }`,
  ])('선택되지 않은 집계 장애가 목록을 막지 않는다: %s', async source => {
    const { count, list, execute } = fixture();
    count.mockRejectedValue(new Error('count unavailable'));
    const result = await execute(source, { skip: true, include: false });
    expect(result.errors).toBeUndefined();
    expect(result.data).toMatchObject({
      productsByCategory: {
        edges: [{ node: { id: 'p3' } }, { node: { id: 'p2' } }],
        pageInfo: { hasNextPage: true, hasPreviousPage: false },
      },
    });
    expect(list).toHaveBeenCalledWith('category-tools', 3, undefined);
    expect(count).not.toHaveBeenCalled();
  });

  it('alias·fragment로 선택된 건수는 connection당 한 번 조회한다', async () => {
    const { count, execute } = fixture();
    const result = await execute(
      `{ productsByCategory(slug: "tools", first: 1) { a: totalCount ...Count } } fragment Count on ProductConnection { b: totalCount }`
    );
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ productsByCategory: { a: 3, b: 3 } });
    expect(count).toHaveBeenCalledTimes(1);
    expect(count).toHaveBeenCalledWith('category-tools');
  });

  it('skip이 해제된 집계의 실패를 정상 0으로 숨기지 않고 다음 요청에서 복구한다', async () => {
    const { count, execute } = fixture();
    count.mockRejectedValueOnce(new Error('count unavailable'));
    const source = 'query($skip: Boolean!) { productsByCategory(slug: "tools") { totalCount @skip(if: $skip) } }';
    const failed = await execute(source, { skip: false });
    expect(failed.data).toBeNull();
    expect(failed.errors?.[0].path).toEqual(['productsByCategory', 'totalCount']);
    const recovered = await execute(source, { skip: false });
    expect(recovered.errors).toBeUndefined();
    expect(recovered.data).toEqual({ productsByCategory: { totalCount: 3 } });
  });

  it.each([{ missing: true }, { empty: true }])(
    '미존재 또는 빈 카테고리의 0건과 페이지 상태를 유지한다: %j',
    async options => {
      const { count, list, execute } = fixture(options);
      const result = await execute(`{ productsByCategory(slug: "tools") { totalCount ${pageFields} } }`);
      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual({
        productsByCategory: {
          totalCount: 0,
          edges: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
        },
      });
      expect(count).toHaveBeenCalledTimes(options.missing ? 0 : 1);
      expect(list).toHaveBeenCalledTimes(options.missing ? 0 : 1);
    }
  );

  it('건수를 읽지 않는 후속 페이지의 cursor와 끝 경계를 보존한다', async () => {
    const { count, execute } = fixture();
    const source = `query($after: String) { productsByCategory(slug: "tools", first: 2, after: $after) { ${pageFields} } }`;
    const first = await execute(source);
    const connection = first.data?.productsByCategory as {
      pageInfo: { endCursor: string };
    };
    const next = await execute(source, {
      after: connection.pageInfo.endCursor,
    });
    expect(next.errors).toBeUndefined();
    expect(next.data).toMatchObject({
      productsByCategory: {
        edges: [{ node: { id: 'p1' } }],
        pageInfo: { hasNextPage: false, hasPreviousPage: true },
      },
    });
    expect(count).not.toHaveBeenCalled();
  });
});
