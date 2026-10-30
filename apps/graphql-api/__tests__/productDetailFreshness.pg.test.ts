import 'reflect-metadata';
import {
  PostgresqlProductFeatureRepository,
  PostgresqlProductFeatureScreenshotRepository,
  PostgresqlProductDescriptionJobRepository,
  PostgresqlProductFlowRepository,
  PostgresqlProductLinkRepository,
  PostgresqlProductRepository,
  PostgresqlProductScreenshotRepository,
} from '@darun/products-datasource';
import {
  GetProduct,
  GetProductLinks,
  GetPublishedProduct,
  GetPublishedProductsForSitemap,
  GetRankedProducts,
} from '@darun/products-domain';
import { ProductQueryResolver } from '@darun/products-feature/server';
import { ProductDescriptionJobService } from '@darun/products-service';
import type { Drizzle } from '@darun/provider-database';
import { PostgresqlAlternativeProductRepository } from '@darun/recommendation-datasource';
import { SearchableProduct, SearchProduct } from '@darun/search-domain';
import { PostgresqlVoteRepository } from '@darun/voting-datasource';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import type * as GraphQL from 'graphql';
import postgres, { type Sql } from 'postgres';
import { buildSchemaSync } from 'type-graphql';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { GetProductDescriptionJobsOnAdminDocument } from '../../../libs/__generated__/graphql';
import { ProductDescriptionQueryResolver } from '../../../libs/products/feature/src/ProductDescription.query.resolver';
import { SearchRanker } from '../../../libs/search/domain/src/services/SearchRanker';
import { SynonymExpander } from '../../../libs/search/domain/src/services/SynonymExpander';

const { execute, graphql } = createRequire(`${process.cwd()}/package.json`)('graphql') as typeof GraphQL;

const url = process.env.PRODUCT_DETAIL_TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
const cases = [
  {
    table: 'product_links',
    parent: 'product_id',
    value: 'title',
    fields: {
      icon_url: '',
      link: 'https://example.com',
      display_link: 'example.com',
    },
    reader: (db: Drizzle) => {
      const repository = new PostgresqlProductLinkRepository(db);
      return (id: string) => repository.findManyByProductId(id);
    },
  },
  {
    table: 'product_features',
    parent: 'product_id',
    value: 'name',
    fields: { emoji: 'x', summary: 'feature summary' },
    reader: (db: Drizzle) => {
      const repository = new PostgresqlProductFeatureRepository(db);
      return (id: string) => repository.findManyByProductId(id);
    },
  },
  {
    table: 'product_screenshots',
    parent: 'product_id',
    value: 'image_alt',
    fields: { image_url: 'https://example.com/product.png' },
    reader: (db: Drizzle) => {
      const repository = new PostgresqlProductScreenshotRepository(db);
      return (id: string) => repository.findManyByProductIdSortByPriorityDesc(id);
    },
  },
  {
    table: 'product_feature_screenshots',
    parent: 'feature_id',
    value: 'image_alt',
    fields: {
      product_id: 'product-a',
      image_url: 'https://example.com/feature.png',
    },
    reader: (db: Drizzle) => {
      const repository = new PostgresqlProductFeatureScreenshotRepository(db);
      return (id: string) => repository.findManyByFeatureIdSortByPriorityDesc(id);
    },
  },
  {
    table: 'alternative_products',
    parent: 'product_id',
    value: 'alternative_product_id',
    fields: {},
    reader: (db: Drizzle) => {
      const repository = new PostgresqlAlternativeProductRepository(db);
      return (id: string) => repository.findManyByProductId(id);
    },
  },
];

suite('상품 상세의 요청 간 최신성 (PRODUCT_DETAIL_TEST_DATABASE_URL 필요)', () => {
  let reader: Sql;
  let writer: Sql;
  let db: Drizzle;
  let selectCount = 0;
  beforeAll(async () => {
    const target = new URL(url!);
    if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.pathname !== '/darun_detail_freshness') {
      throw new Error('Requires isolated local darun_detail_freshness database');
    }
    writer = postgres(url!, { max: 1, connect_timeout: 5 });
    reader = postgres(url!, { max: 1, connect_timeout: 5 });
    await migrate(drizzle(writer), {
      migrationsFolder: resolve(__dirname, '../scripts/migrations'),
    });
    db = drizzle(reader, {
      logger: {
        logQuery: query => {
          if (/^select /i.test(query)) selectCount++;
        },
      },
    });
  }, 30000);
  beforeEach(() => {
    selectCount = 0;
  });
  afterAll(async () => {
    if (reader) await reader.end({ timeout: 5 });
    if (writer) await writer.end({ timeout: 5 });
  });

  describe.each(cases)('$table', spec => {
    const seed = async () => {
      await writer`delete from ${writer(spec.table)}`;
      for (const [id, parent, value] of [
        ['row-a', 'parent-a', 'before-a'],
        ['row-b', 'parent-b', 'before-b'],
      ]) {
        const row = {
          ...spec.fields,
          id,
          [spec.parent]: parent,
          [spec.value]: value,
        };
        await writer`insert into ${writer(spec.table)} ${writer(row)}`;
      }
    };
    const valueOf = (row: object) => {
      const fields = row as Record<string, unknown>;
      return fields['title'] ?? fields['name'] ?? fields['imageAlt'] ?? fields['alternativeProductId'];
    };

    it('같은 tick을 배치 조회하고 별도 연결의 commit 후 수정·삭제·빈 목록의 추가를 반영한다', async () => {
      await seed();
      const read = spec.reader(db);
      const batch = () => Promise.all(['parent-b', 'missing', 'parent-a', 'parent-b'].map(read));
      const before = await batch();
      expect(before.map(rows => rows.map(row => row.id))).toEqual([['row-b'], [], ['row-a'], ['row-b']]);
      expect(selectCount).toBe(1);
      await writer.begin(async tx => {
        await tx`update ${tx(spec.table)} set ${tx(spec.value)} = 'after-a' where id = 'row-a'`;
        await tx`delete from ${tx(spec.table)} where id = 'row-b'`;
        const row = {
          ...spec.fields,
          id: 'row-new',
          [spec.parent]: 'missing',
          [spec.value]: 'new-value',
        };
        await tx`insert into ${tx(spec.table)} ${tx(row)}`;
      });
      const after = await batch();
      expect(after.map(rows => rows.map(row => row.id))).toEqual([[], ['row-new'], ['row-a'], []]);
      expect(valueOf(after[2][0])).toBe('after-a');
      expect(valueOf(after[1][0])).toBe('new-value');
      expect(selectCount).toBe(2);
    });

    it('별도 연결의 변경이 rollback되면 기존 값을 유지한다', async () => {
      await seed();
      const read = spec.reader(db);
      expect((await read('parent-a')).map(valueOf)).toEqual(['before-a']);
      await expect(
        writer.begin(async tx => {
          await tx`update ${tx(spec.table)} set ${tx(spec.value)} = 'rolled-back' where id = 'row-a'`;
          await tx`delete from ${tx(spec.table)} where id = 'row-b'`;
          throw new Error('synthetic rollback');
        })
      ).rejects.toThrow('synthetic rollback');
      expect((await read('parent-a')).map(valueOf)).toEqual(['before-a']);
      expect((await read('parent-b')).map(valueOf)).toEqual(['before-b']);
    });
  });

  describe.each(cases.filter(spec => spec.table.includes('screenshots')))('$table 우선순위', spec => {
    it('삽입 순서와 무관하게 priority DESC·id ASC로 정렬하고 여러 부모를 한 번에 조회한다', async () => {
      await writer`delete from ${writer(spec.table)}`;
      for (const [id, parent, priority] of [
        ['a-low', 'parent-a', -1],
        ['b-high', 'parent-b', 9],
        ['a-tie-z', 'parent-a', 5],
        ['b-low', 'parent-b', 0],
        ['a-high', 'parent-a', 10],
        ['a-tie-a', 'parent-a', 5],
      ] as const) {
        const row = {
          ...spec.fields,
          id,
          [spec.parent]: parent,
          [spec.value]: id,
          priority,
          created_at: '2026-01-01T00:00:00Z',
        };
        await writer`insert into ${writer(spec.table)} ${writer(row)}`;
      }

      const read = spec.reader(db);
      const ids = (rows: { id: string }[]) => rows.map(row => row.id);
      const first = await Promise.all(['parent-b', 'missing', 'parent-a', 'parent-b'].map(read));
      expect(first.map(ids)).toEqual([
        ['b-high', 'b-low'],
        [],
        ['a-high', 'a-tie-a', 'a-tie-z', 'a-low'],
        ['b-high', 'b-low'],
      ]);
      expect(selectCount).toBe(1);

      // A physical row update and reversed batch keys must not change equal-priority ordering.
      await writer`update ${writer(spec.table)} set image_alt = 'edited' where id = 'a-tie-a'`;
      const second = await Promise.all(['parent-a', 'parent-b'].map(read));
      expect(second.map(ids)).toEqual([ids(first[2]), ids(first[0])]);
      expect(selectCount).toBe(2);

      await writer`update ${writer(spec.table)} set priority = 11 where id = 'a-low'`;
      expect(ids(await read('parent-a'))).toEqual(['a-low', 'a-high', 'a-tie-a', 'a-tie-z']);
      expect(selectCount).toBe(3);
    });
  });

  describe('소개 작업의 현재 상품 주소 배치 조회', () => {
    const productRows = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        id: `job-product-${index}`,
        name: `Product ${index}`,
        slug: `current-product-${index}`,
        summary: 'summary',
        logo_url: '',
      }));

    beforeEach(async () => {
      await writer`delete from product_description_jobs`;
      await writer`delete from products where id like 'job-product-%'`;
    });
    afterAll(async () => {
      await writer`delete from product_description_jobs`;
      await writer`delete from products where id like 'job-product-%'`;
    });

    async function fixture(count: number, shared = false) {
      const rows = productRows(shared ? 1 : count);
      await writer`insert into products ${writer(rows)}`;
      const jobs = Array.from({ length: count }, (_, index) => ({
        id: `slug-job-${String(index).padStart(3, '0')}`,
        product_id: rows[shared ? 0 : count - index - 1].id,
        status: 'completed',
        created_at: new Date(Date.parse('2026-10-01T00:00:00Z') + index * 1000).toISOString(),
      }));
      await writer`insert into product_description_jobs ${writer(jobs)}`;
      const getProduct = new GetProduct(new PostgresqlProductRepository(db));
      const service = new ProductDescriptionJobService(
        getProduct,
        {} as never,
        new PostgresqlProductDescriptionJobRepository(db),
        {} as never
      );
      const resolver = new ProductDescriptionQueryResolver(service, {} as never, getProduct);
      const schema = buildSchemaSync({
        resolvers: [ProductDescriptionQueryResolver],
        container: { get: () => resolver },
        authChecker: ({ context }) => context.admin === true,
      });
      const read = () =>
        execute({
          schema,
          document: GetProductDescriptionJobsOnAdminDocument,
          variableValues: { limit: count },
          contextValue: { admin: true },
        });
      return { schema, read, jobs, rows };
    }

    it.each([
      [100, true, 1],
      [100, false, 1],
    ] as const)('%i건의 작업(shared=%s)은 상품 SQL %i회로 주소와 순서를 보존한다', async (count, shared, batches) => {
      const { read, jobs, rows } = await fixture(count, shared);
      const result = await read();
      expect(result.errors).toBeUndefined();
      const byId = new Map(rows.map(row => [row.id, row.slug]));
      expect(result.data?.productDescriptionJobs).toEqual(
        [...jobs].reverse().map(job =>
          expect.objectContaining({
            id: job.id,
            productId: job.product_id,
            productSlug: byId.get(job.product_id),
          })
        )
      );
      // One job-list SELECT plus bounded product batches, including repeated IDs.
      expect(selectCount).toBe(1 + batches);
    });

    it('201개 ID는 최대 100개씩 나누어 읽고 중복·부재 ID의 위치를 보존한다', async () => {
      const rows = productRows(199);
      await writer`insert into products ${writer(rows)}`;
      const ids = [...rows.map(row => row.id).reverse(), 'missing-product', rows[0].id];
      const repository = new PostgresqlProductRepository(db);
      const result = await Promise.all(ids.map(id => repository.findOneById(id)));
      const byId = new Map(rows.map(row => [row.id, row.slug]));
      expect(result.map(product => product?.slug ?? null)).toEqual(ids.map(id => byId.get(id) ?? null));
      expect(selectCount).toBe(3);
    });

    it('같은 warm reader의 다음 요청은 별도 writer의 commit·rollback·삭제·재생성을 반영한다', async () => {
      const { schema, read, rows } = await fixture(1);
      expect((await read()).data?.productDescriptionJobs).toEqual([
        expect.objectContaining({ productSlug: 'current-product-0' }),
      ]);
      await writer`update products set slug = 'renamed-product' where id = ${rows[0].id}`;
      expect((await read()).data?.productDescriptionJobs).toEqual([
        expect.objectContaining({ productSlug: 'renamed-product' }),
      ]);
      await expect(
        writer.begin(async tx => {
          await tx`update products set slug = 'rolled-back' where id = ${rows[0].id}`;
          throw new Error('synthetic rollback');
        })
      ).rejects.toThrow('synthetic rollback');
      expect((await read()).data?.productDescriptionJobs).toEqual([
        expect.objectContaining({ productSlug: 'renamed-product' }),
      ]);
      await writer`delete from products where id = ${rows[0].id}`;
      const missing = await read();
      expect(missing.errors).toHaveLength(1);
      expect(missing.errors![0].message).toBe('소개 후보에 연결된 제품을 찾지 못했습니다.');
      expect(missing.errors![0].path).toEqual(['productDescriptionJobs', 0, 'productSlug']);
      expect(missing.data).toBeNull();
      await writer`insert into products ${writer({ ...rows[0], slug: 'restored-product' })}`;
      const restored = await read();
      expect(restored.errors).toBeUndefined();
      expect(restored.data?.productDescriptionJobs).toEqual([
        expect.objectContaining({ productSlug: 'restored-product' }),
      ]);
      const single = await graphql({
        schema,
        source: '{ productDescriptionJob(id: "slug-job-000") { productSlug } }',
        contextValue: { admin: true },
      });
      expect(single.errors).toBeUndefined();
      expect(single.data?.productDescriptionJob).toEqual({
        productSlug: 'restored-product',
      });
      expect(selectCount).toBe(12);
    });

    it.each(['id', 'id productSlug @skip(if: true)', 'id productSlug @include(if: false)'])(
      '주소를 선택하지 않은 목록(%s)은 상품을 읽지 않는다',
      async fields => {
        const { schema } = await fixture(2);
        const result = await graphql({
          schema,
          source: `{ productDescriptionJobs { ${fields} } }`,
          contextValue: { admin: true },
        });
        expect(result.errors).toBeUndefined();
        expect(result.data?.productDescriptionJobs).toEqual([{ id: 'slug-job-001' }, { id: 'slug-job-000' }]);
        expect(selectCount).toBe(1);
      }
    );

    it('관리자가 아닌 요청은 작업과 상품 SQL 전에 거절한다', async () => {
      const { schema } = await fixture(1);
      const result = await execute({
        schema,
        document: GetProductDescriptionJobsOnAdminDocument,
        contextValue: { admin: false },
      });
      expect(result.errors).toHaveLength(1);
      expect(result.data).toBeNull();
      expect(selectCount).toBe(0);
    });
  });

  describe('상품 대표 링크의 전체 순서', () => {
    beforeEach(async () => {
      await writer`delete from product_links`;
      await writer`insert into products (id, name, slug, summary, logo_url) values
        ('link-parent-a', 'Link A', 'link-parent-a', '', ''),
        ('link-parent-b', 'Link B', 'link-parent-b', '', '')`;
      for (const [id, parent, createdAt] of [
        ['a-new', 'link-parent-a', '2026-01-03'],
        ['b-tie-z', 'link-parent-b', '2026-01-01'],
        ['a-tie-z', 'link-parent-a', '2026-01-01'],
        ['b-new', 'link-parent-b', '2026-01-02'],
        ['a-tie-a', 'link-parent-a', '2026-01-01'],
        ['b-tie-a', 'link-parent-b', '2026-01-01'],
      ]) {
        await writer`insert into product_links (id, product_id, title, link, display_link, icon_url, created_at)
          values (${id}, ${parent}, ${id}, ${`https://example.com/${id}`}, ${id}, '', ${createdAt})`;
      }
      selectCount = 0;
    });

    afterEach(async () => {
      await writer`delete from product_links`;
      await writer`delete from products where id in ('link-parent-a', 'link-parent-b')`;
    });

    it('삽입·배치 순서와 제목·URL 수정에 관계없이 createdAt ASC·id ASC 순서를 유지한다', async () => {
      const repository = new PostgresqlProductLinkRepository(db);
      const read = (ids: string[]) => Promise.all(ids.map(id => repository.findManyByProductId(id)));
      const idsOf = (rows: { id: string }[]) => rows.map(row => row.id);
      const first = await read(['link-parent-b', 'missing', 'link-parent-a', 'link-parent-b']);
      expect(first.map(idsOf)).toEqual([
        ['b-tie-a', 'b-tie-z', 'b-new'],
        [],
        ['a-tie-a', 'a-tie-z', 'a-new'],
        ['b-tie-a', 'b-tie-z', 'b-new'],
      ]);
      expect(selectCount).toBe(1);

      await repository.updateById('a-tie-a', 'link-parent-a', link => {
        link.update({ title: 'Edited primary', link: 'https://example.com/edited' });
        return link;
      });
      await writer`update product_links set title = 'Edited secondary' where id = 'b-tie-z'`;
      selectCount = 0;
      const second = await read(['link-parent-a', 'link-parent-b']);
      expect(second.map(idsOf)).toEqual([idsOf(first[2]), idsOf(first[0])]);
      expect(second[0][0]).toMatchObject({ title: 'Edited primary', link: 'https://example.com/edited' });
      expect(selectCount).toBe(1);
    });

    it('관리자와 공개 GraphQL 조회가 같은 첫 링크만 대표로 반환한다', async () => {
      await writer`update products set published_at = '2026-01-01' where id in ('link-parent-a', 'link-parent-b')`;
      const productRepository = new PostgresqlProductRepository(db);
      const resolver = Object.assign(Object.create(ProductQueryResolver.prototype) as ProductQueryResolver, {
        getProductUseCase: new GetProduct(productRepository),
        getPublishedProductUseCase: new GetPublishedProduct(productRepository),
        getProductLinksUseCase: new GetProductLinks(new PostgresqlProductLinkRepository(db)),
      });
      const schema = buildSchemaSync({
        resolvers: [ProductQueryResolver],
        authChecker: () => true,
        container: { get: () => resolver },
      });
      const result = await graphql({
        schema,
        source: `{
          admin: tempProductBySlug(slug: "link-parent-a") { links { id isPrimary } }
          public: productBySlug(slug: "link-parent-a", locale: "ko") { links { id isPrimary } }
        }`,
      });
      expect(result.errors).toBeUndefined();
      const expected = {
        links: [
          { id: 'a-tie-a', isPrimary: true },
          { id: 'a-tie-z', isPrimary: false },
          { id: 'a-new', isPrimary: false },
        ],
      };
      expect(result.data).toEqual({ admin: expected, public: expected });
    });
  });

  describe('랭킹 후보의 실제 투표 수', () => {
    it('검색 색인을 바꾸지 않아도 다음 재정렬은 별도 연결의 투표 변경·삭제를 한 SQL로 읽는다', async () => {
      await writer`delete from votes`;
      await writer`insert into votes (id, target_id, count) values
        ('search-vote-a', 'search-a', 40), ('search-vote-b', 'search-b', 11),
        ('search-vote-outside', 'outside', 99999)`;
      const now = new Date('2026-01-04T00:00:00Z');
      const candidates = ['a', 'b', 'missing'].map(
        (id, index) =>
          new SearchableProduct({
            id: `search-${id}`,
            slug: `search-${id}`,
            name: id,
            summary: id,
            searchScore: 5,
            votes: [900, 0, 9999][index],
            publishedAt: now,
            sourceRevision: '7',
          })
      );
      const search = {
        index: vi.fn(),
        searchProduct: vi.fn().mockResolvedValue(candidates),
      };
      const useCase = new SearchProduct(
        search,
        new PostgresqlVoteRepository(db),
        new SynonymExpander(),
        new SearchRanker({
          now: () => now,
          nowMilliseconds: () => now.getTime(),
        })
      );
      try {
        expect((await useCase.execute({ query: 'fixture', limit: 2 })).map(p => [p.id, p.votes])).toEqual([
          ['search-a', 40],
          ['search-b', 11],
        ]);
        expect(selectCount).toBe(1);
        await writer`update votes set count = 71 where target_id = 'search-b'`;
        await writer`delete from votes where target_id = 'search-a'`;
        expect((await useCase.execute({ query: 'fixture', limit: 3 })).map(p => [p.id, p.votes])).toEqual([
          ['search-b', 71],
          ['search-a', 0],
          ['search-missing', 0],
        ]);
        expect(selectCount).toBe(2);
        expect(search.index).not.toHaveBeenCalled();
        expect(candidates.map(p => [p.votes, p.searchScore, p.sourceRevision])).toEqual([
          [900, 5, '7'],
          [0, 5, '7'],
          [9999, 5, '7'],
        ]);
      } finally {
        await writer`delete from votes`;
      }
    });

    it('요청한 ID만 한 번에 읽고 별도 연결이 수정·삭제한 투표도 다음 조회에 반영한다', async () => {
      await writer`delete from votes`;
      await writer`insert into votes (id, target_id, count) values
        ('ranking-vote-a', 'ranking-a', 7), ('ranking-vote-b', 'ranking-b', 23),
        ('ranking-vote-outside', 'outside', 999)`;
      const repository = new PostgresqlVoteRepository(db);
      const ids = ['ranking-b', 'missing', 'ranking-a', 'ranking-b'];
      const counts = async () => (await repository.findByTargetIds(ids)).map(row => [row.targetId, row.count]).sort();
      expect(await counts()).toEqual([
        ['ranking-a', 7],
        ['ranking-b', 23],
      ]);
      expect(selectCount).toBe(1);
      await writer`update votes set count = 41 where target_id = 'ranking-a'`;
      await writer`delete from votes where target_id = 'ranking-b'`;
      expect(await counts()).toEqual([['ranking-a', 41]]);
      expect(selectCount).toBe(2);
      expect(await repository.findByTargetIds([])).toEqual([]);
      expect(selectCount).toBe(2);
    });

    it('실제 상품·투표 저장소에서 최신 저득표 상품을 평가하고 새 투표를 캐시 점수에 반영한다', async () => {
      await writer`delete from votes`;
      await writer`insert into products (id, name, slug, summary, logo_url, published_at) values
        ('ranking-old', 'Older', 'ranking-old', 'summary', '', '2026-01-01T00:00:00'),
        ('ranking-recent', 'Recent', 'ranking-recent', 'summary', '', '2026-01-03T22:00:00'),
        ('ranking-zero', 'Zero', 'ranking-zero', 'summary', '', '2026-01-03T23:00:00'),
        ('ranking-hidden', 'Hidden', 'ranking-hidden', 'summary', '', null)`;
      try {
        await writer`insert into votes (id, target_id, count) values
          ('ranking-vote-old', 'ranking-old', 100), ('ranking-vote-recent', 'ranking-recent', 5),
          ('ranking-vote-hidden', 'ranking-hidden', 1000)`;
        const voteRepository = new PostgresqlVoteRepository(db);
        const batch = vi.spyOn(voteRepository, 'findByTargetIds');
        const now = new Date('2026-01-04T00:00:00Z');
        const ranking = new GetRankedProducts(voteRepository, new PostgresqlProductRepository(db), {
          now: () => now,
          nowMilliseconds: () => now.getTime(),
        });
        expect((await ranking.execute({ limit: 2 })).map(product => product.id)).toEqual([
          'ranking-recent',
          'ranking-old',
        ]);
        expect(batch).toHaveBeenCalledExactlyOnceWith(['ranking-old', 'ranking-recent', 'ranking-zero']);
        await writer`update votes set count = 0 where target_id = 'ranking-recent'`;
        expect((await ranking.execute({ limit: 2 })).map(product => product.id)).toEqual([
          'ranking-old',
          'ranking-zero',
        ]);
        expect(batch).toHaveBeenCalledTimes(2);
      } finally {
        await writer`delete from products where id in ('ranking-old', 'ranking-recent', 'ranking-zero', 'ranking-hidden')`;
        await writer`delete from votes`;
      }
    });
  });

  describe('Visual 조회의 rolling 24시간 중복 제외', () => {
    let first: Sql;
    let second: Sql;
    const applicationName = `visual-view-${randomUUID()}`;
    const viewerHash = 'a'.repeat(64);
    const targetId = '01K00000000000000000000479';
    const otherTargetId = '01K00000000000000000000480';
    const initialTime = Date.parse('2030-01-01T23:59:00.000Z');

    beforeAll(async () => {
      const options = {
        max: 1,
        prepare: false,
        connection: {
          application_name: applicationName,
          statement_timeout: 5000,
          lock_timeout: 4000,
        },
      };
      first = postgres(url!, options);
      second = postgres(url!, options);
      await writer`insert into products (id, name, slug, summary, logo_url)
        values (${targetId}, 'Visual fixture', ${applicationName}, 'summary', 'https://example.com/logo.png')`;
      for (const id of [targetId, otherTargetId]) {
        await writer`insert into product_screenshots (id, product_id, image_url, image_alt)
          values (${id}, ${targetId}, 'https://example.com/screen.png', 'screen')`;
        await writer`insert into product_flows (id, product_id, title, platform, flow_type)
          values (${id}, ${targetId}, 'flow', 'WEB', 'OTHER')`;
      }
    });
    afterAll(async () => {
      vi.restoreAllMocks();
      await first?.end({ timeout: 5 });
      await second?.end({ timeout: 5 });
      await writer`delete from products where id = ${targetId}`;
      await writer`delete from product_screenshots where id in (${targetId}, ${otherTargetId})`;
    });

    const targets = [
      {
        kind: 'screenshot',
        record: (connection: Sql, id = targetId, hash = viewerHash) =>
          new PostgresqlProductScreenshotRepository(drizzle(connection)).insertVisualViewEvent({
            screenshotId: id,
            viewerHash: hash,
          }),
      },
      {
        kind: 'flow',
        record: (connection: Sql, id = targetId, hash = viewerHash) =>
          new PostgresqlProductFlowRepository(drizzle(connection)).insertVisualViewEvent({
            flowId: id,
            viewerHash: hash,
          }),
      },
    ];

    async function waitForBlockedRequests(count: number) {
      await vi.waitFor(
        async () => {
          const [row] = await reader`select count(*)::int as count from pg_stat_activity
            where application_name = ${applicationName} and wait_event = 'advisory'`;
          expect(row.count).toBe(count);
        },
        { timeout: 2000, interval: 10 }
      );
    }

    describe.each(targets)('$kind', target => {
      beforeEach(async () => {
        await writer`delete from visual_view_events`;
        vi.spyOn(Date, 'now').mockReturnValue(initialTime);
      });

      it('별도 연결의 동시 최초 요청은 한 건만 기록한다', async () => {
        // Hold both INSERTs after their duplicate SELECTs on the unfixed code.
        // On the fixed code the second request instead waits on the viewer/target lock.
        await writer`create or replace function visual_view_test_gate() returns trigger language plpgsql as $$
          begin perform pg_advisory_xact_lock(479, 1); return new; end $$`;
        await writer`create trigger visual_view_test_gate before insert on visual_view_events
          for each row execute function visual_view_test_gate()`;
        await writer`select pg_advisory_lock(479, 1)`;
        const requests = [target.record(first), target.record(second)];
        // Attach a rejection handler immediately, including on assertion failure.
        const settled = Promise.allSettled(requests);
        try {
          await waitForBlockedRequests(2);
        } finally {
          await writer`select pg_advisory_unlock(479, 1)`;
          await settled;
          await writer`drop trigger visual_view_test_gate on visual_view_events`;
          await writer`drop function visual_view_test_gate()`;
        }
        expect(await Promise.all(requests)).toEqual(expect.arrayContaining([true, false]));
        const events = await writer`select viewer_hash, screenshot_id, flow_id from visual_view_events`;
        expect(events).toEqual([
          {
            viewer_hash: viewerHash,
            screenshot_id: target.kind === 'screenshot' ? targetId : null,
            flow_id: target.kind === 'flow' ? targetId : null,
          },
        ]);
      });

      it('날짜가 바뀌어도 24시간 직전과 정확한 경계는 제외하고 경계 이후 기록한다', async () => {
        expect(await target.record(first)).toBe(true);
        for (const elapsed of [2 * 60_000, 86_399_999, 86_400_000]) {
          vi.mocked(Date.now).mockReturnValue(initialTime + elapsed);
          expect(await target.record(second)).toBe(false);
        }
        vi.mocked(Date.now).mockReturnValue(initialTime + 86_400_001);
        expect(await target.record(second)).toBe(true);
        const rows = await writer`select to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS') as time
          from visual_view_events order by created_at`;
        expect(rows.map(row => row.time)).toEqual(['2030-01-01T23:59:00.000', '2030-01-02T23:59:00.001']);
      });

      it('잠금 대기 중 24시간을 지나면 잠금을 얻은 시각으로 다시 판단한다', async () => {
        await writer`create or replace function visual_view_test_gate() returns trigger language plpgsql as $$
          begin perform pg_advisory_xact_lock(479, 1); return new; end $$`;
        await writer`create trigger visual_view_test_gate before insert on visual_view_events
          for each row execute function visual_view_test_gate()`;
        await writer`select pg_advisory_lock(479, 1)`;
        const requests = [target.record(first)];
        let settled = Promise.allSettled(requests);
        try {
          await waitForBlockedRequests(1);
          requests.push(target.record(second));
          settled = Promise.allSettled(requests);
          await waitForBlockedRequests(2);
          vi.mocked(Date.now).mockReturnValue(initialTime + 86_400_001);
        } finally {
          await writer`select pg_advisory_unlock(479, 1)`;
          await settled;
          await writer`drop trigger visual_view_test_gate on visual_view_events`;
          await writer`drop function visual_view_test_gate()`;
        }
        expect(await Promise.all(requests)).toEqual([true, true]);
        const rows = await writer`select to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS') as time
          from visual_view_events order by created_at`;
        expect(rows.map(row => row.time)).toEqual(['2030-01-01T23:59:00.000', '2030-01-02T23:59:00.001']);
      });

      it('다른 viewer와 대상은 첫 기록의 commit을 기다리지 않고 독립적으로 기록한다', async () => {
        await writer`create or replace function visual_view_test_gate() returns trigger language plpgsql as $$
          begin
            if new.viewer_hash = repeat('a', 64)
              and coalesce(new.screenshot_id, new.flow_id) = '01K00000000000000000000479' then
              perform pg_advisory_xact_lock(479, 1);
            end if;
            return new;
          end $$`;
        await writer`create trigger visual_view_test_gate before insert on visual_view_events
          for each row execute function visual_view_test_gate()`;
        await writer`select pg_advisory_lock(479, 1)`;
        const pending = target.record(first);
        const settled = Promise.allSettled([pending]);
        try {
          await waitForBlockedRequests(1);
          expect(await target.record(second, targetId, 'b'.repeat(64))).toBe(true);
          expect(await target.record(second, otherTargetId)).toBe(true);
        } finally {
          await writer`select pg_advisory_unlock(479, 1)`;
          await settled;
          await writer`drop trigger visual_view_test_gate on visual_view_events`;
          await writer`drop function visual_view_test_gate()`;
        }
        expect(await pending).toBe(true);
        const [row] = await writer`select count(*)::int as count from visual_view_events`;
        expect(row.count).toBe(3);
      });

      it('INSERT 실패를 전파하고 transaction과 잠금을 정리해 재시도할 수 있다', async () => {
        await writer`create or replace function visual_view_test_failure() returns trigger language plpgsql as $$
          begin raise exception 'synthetic view insert failure'; end $$`;
        await writer`create trigger visual_view_test_failure before insert on visual_view_events
          for each row execute function visual_view_test_failure()`;
        try {
          await expect(target.record(first)).rejects.toMatchObject({
            cause: { message: 'synthetic view insert failure' },
          });
        } finally {
          await writer`drop trigger visual_view_test_failure on visual_view_events`;
          await writer`drop function visual_view_test_failure()`;
        }
        expect(await target.record(second)).toBe(true);
        const [row] = await writer`select count(*)::int as count from visual_view_events`;
        expect(row.count).toBe(1);
      });
    });

    it('같은 ID의 화면과 플로는 별도 대상이며 두 저장소의 플로 기록은 같은 정책을 사용한다', async () => {
      await writer`delete from visual_view_events`;
      vi.spyOn(Date, 'now').mockReturnValue(initialTime);
      expect(await targets[0].record(first)).toBe(true);
      expect(await targets[1].record(second)).toBe(true);
      expect(
        await new PostgresqlProductScreenshotRepository(drizzle(first)).insertVisualViewEvent({
          flowId: targetId,
          viewerHash,
        })
      ).toBe(false);
      const [row] = await writer`select count(*)::int as count from visual_view_events`;
      expect(row.count).toBe(2);
    });
  });
  describe('사이트맵 대안 존재 여부의 선택적 batch 조회', () => {
    const sources = Array.from({ length: 100 }, (_, index) => ({
      id: `z-source-${String(index).padStart(3, '0')}`,
      kind: index % 6,
      expected: [true, false, true, true, true, false][index % 6],
    })).reverse();
    let productRepository: PostgresqlProductRepository;
    const queries: string[] = [];
    const existenceQueries = () => queries.filter(query => query.includes('alternative_products'));
    const sitemapSource = readFileSync(resolve(__dirname, '../../service-web/app/sitemap-data.ts'), 'utf8');
    const operation = /gql`(\s*query PublishedProductsForSitemap[\s\S]*?)`/.exec(sitemapSource)![1];
    const execute = (source = operation, variableValues = { first: 100 }) => {
      const resolver = Object.assign(Object.create(ProductQueryResolver.prototype) as ProductQueryResolver, {
        getPublishedProductsForSitemapUseCase: new GetPublishedProductsForSitemap(productRepository),
        productRepository,
      });
      const schema = buildSchemaSync({
        resolvers: [ProductQueryResolver],
        authChecker: () => true,
        container: { get: () => resolver },
      });
      return graphql({ schema, source, variableValues });
    };

    beforeEach(async () => {
      await writer`truncate alternative_products, products, product_tags, tags cascade`;
      const candidates = ['manual-0', 'manual-1', 'manual-2', 'manual-3', 'manual-4', 'manual-5', 'category', 'tag'];
      const productRows = [...candidates, 'draft', ...sources.map(source => source.id)].map(id => {
        const source = sources.find(source => source.id === id);
        return {
          id,
          slug: id,
          name: id,
          summary: '',
          logo_url: '',
          published_at: id === 'draft' ? null : source ? '2025-01-01' : '2026-01-01',
          category_ids: id === 'category' || source?.kind === 3 ? '["shared"]' : '[]',
        };
      });
      const alternativeRows = sources.flatMap(source => {
        const ids =
          source.kind === 0
            ? ['manual-0']
            : source.kind === 1
              ? ['draft']
              : source.kind === 2
                ? candidates.slice(0, 6)
                : [];
        return ids.map((id, index) => ({
          id: `${source.id}-${index}`,
          product_id: source.id,
          alternative_product_id: id,
        }));
      });
      const taggedSources = sources.filter(source => source.kind === 4);
      const tags = taggedSources.map(source => ({
        id: source.id,
        name: source.id,
        type: 'feature',
      }));
      const tagRows = taggedSources.flatMap(source => [
        {
          id: `${source.id}-source`,
          product_id: source.id,
          tag_id: source.id,
        },
        {
          id: `${source.id}-candidate`,
          product_id: 'tag',
          tag_id: source.id,
        },
      ]);
      await writer.begin(async tx => {
        await tx`insert into products ${tx(productRows)}`;
        await tx`insert into tags ${tx(tags)}`;
        await tx`insert into alternative_products ${tx(alternativeRows)}`;
        await tx`insert into product_tags ${tx(tagRows)}`;
      });
      productRepository = new PostgresqlProductRepository(
        drizzle(reader, {
          logger: { logQuery: query => queries.push(query) },
        })
      );
      queries.length = 0;
    });

    afterEach(async () => {
      await writer`truncate alternative_products, products, product_tags, tags cascade`;
    });

    it('실제 PublishedProductsForSitemap의 100개 Boolean을 한 SQL로 계산하고 본문을 읽지 않는다', async () => {
      const result = await execute();
      expect(result.errors).toBeUndefined();
      expect(result.data?.publishedProductsForSitemap).toEqual(
        sources.map(source =>
          expect.objectContaining({
            id: source.id,
            hasAlternatives: source.expected,
          })
        )
      );
      expect(existenceQueries()).toHaveLength(1);
      expect(existenceQueries()[0]).not.toMatch(/description|summary|logo_url/);
      expect(queries).toHaveLength(2); // Product page and the optional existence batch.
    });

    it.each([
      'query($first: Int!) { publishedProductsForSitemap(first: $first) { id } }',
      'query($first: Int!) { publishedProductsForSitemap(first: $first) { id hasAlternatives @skip(if: true) } }',
      'query($first: Int!) { publishedProductsForSitemap(first: $first) { id hasAlternatives @include(if: false) } }',
    ])('필드를 선택하지 않으면 존재 계산 SQL을 실행하지 않는다: %s', async source => {
      const result = await execute(source);
      expect(result.errors).toBeUndefined();
      expect(result.data?.publishedProductsForSitemap).toHaveLength(100);
      expect(existenceQueries()).toHaveLength(0);
      expect(queries).toHaveLength(1);
    });

    it('중복·부재 ID의 순서를 보존하며 100개를 넘는 호출을 bounded batch로 나눈다', async () => {
      const ids = [...sources.map(source => source.id), ...sources.map(source => source.id), 'absent'];
      const result = await Promise.all(ids.map(id => productRepository.hasPublishedAlternatives(id)));
      expect(result).toEqual([
        ...sources.map(source => source.expected),
        ...sources.map(source => source.expected),
        false,
      ]);
      expect(existenceQueries()).toHaveLength(3);
    });

    it('같은 reader의 다음 요청은 공개·태그·관계 변경을 읽고 미존재·미발행·자기 참조를 구분한다', async () => {
      const read = (...ids: string[]) => Promise.all(ids.map(id => productRepository.hasPublishedAlternatives(id)));
      expect(await read('z-source-000', 'z-source-001', 'z-source-004', 'absent')).toEqual([true, false, true, false]);
      await writer`update products set published_at = null where id = 'manual-0'`;
      await writer`update products set published_at = '2026-01-01' where id = 'draft'`;
      await writer`delete from product_tags where product_id = 'tag'`;
      expect(await read('z-source-000', 'z-source-001', 'z-source-004', 'absent')).toEqual([false, true, false, false]);
      await writer`insert into alternative_products (id, product_id, alternative_product_id)
        values ('self', 'z-source-005', 'z-source-005'), ('missing-target', 'z-source-005', 'absent')`;
      expect(await read('z-source-005')).toEqual([false]);
      await writer`update products set published_at = null where id in ('z-source-000', 'z-source-003', 'z-source-004')`;
      await writer`insert into alternative_products (id, product_id, alternative_product_id)
        values ('draft-source', 'z-source-000', 'draft')`;
      expect(await read('z-source-000', 'z-source-003', 'z-source-004')).toEqual([true, false, false]);
    });

    it('최신 50개 밖의 태그 전용 후보는 기존처럼 존재 판정에서 제외한다', async () => {
      await writer`update products set published_at = '2020-01-01' where id = 'tag'`;
      expect(await productRepository.hasPublishedAlternatives('z-source-004')).toBe(false);
    });

    it('SQL 실패를 false로 숨기지 않고 다음 요청에서 다시 조회한다', async () => {
      let fail = true;
      const failingRepository = new PostgresqlProductRepository(
        drizzle(reader, {
          logger: {
            logQuery: () => {
              if (fail) throw new Error('synthetic read failure');
            },
          },
        })
      );
      await expect(failingRepository.hasPublishedAlternatives('z-source-000')).rejects.toThrow(
        'synthetic read failure'
      );
      fail = false;
      expect(await failingRepository.hasPublishedAlternatives('z-source-000')).toBe(true);
    });
  });
});
