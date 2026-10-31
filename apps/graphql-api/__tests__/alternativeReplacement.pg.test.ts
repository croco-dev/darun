import 'reflect-metadata';
import { PostgresqlProductRepository, PostgresqlProductTagRepository } from '@darun/products-datasource';
import { GetPublishedProduct, Product } from '@darun/products-domain';
import { ProductQueryResolver } from '@darun/products-feature/server';
import { PostgresqlAlternativeProductRepository } from '@darun/recommendation-datasource';
import { AlternativeProduct, GetAlternativeProducts, UpdateAlternativeProduct } from '@darun/recommendation-domain';
import { PostgresqlTranslationRepository } from '@darun/translation-datasource';
import { TranslationService, computeSourceHash } from '@darun/translation-domain';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres, { type Sql } from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { AutoRecommender } from '../../../libs/recommendation/domain/src/services/AutoRecommender';

const url = process.env.ALTERNATIVE_TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite('대안 교체 PostgreSQL 무결성 (ALTERNATIVE_TEST_DATABASE_URL 필요)', () => {
  let client: Sql;
  let repository: PostgresqlAlternativeProductRepository;
  const update = (ids: string[], productId = 'source') =>
    new UpdateAlternativeProduct(repository).execute({
      productId,
      alternativeProductIds: ids,
    });
  const rows = () =>
    client`select id, alternative_product_id from alternative_products where product_id = 'source' order by alternative_product_id`;

  beforeAll(async () => {
    const target = new URL(url!);
    if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.pathname !== '/darun_alternative_integrity') {
      throw new Error('Requires isolated local darun_alternative_integrity database');
    }
    client = postgres(url!, { max: 12, connect_timeout: 5 });
    await migrate(drizzle(client), {
      migrationsFolder: resolve(__dirname, '../scripts/migrations'),
    });
    await client`create or replace function reject_alternative_write() returns trigger language plpgsql as $$
      begin
        if current_setting('darun.reject_all', true) = 'true' or
          (TG_OP = 'INSERT' and NEW.alternative_product_id = 'reject') then
          raise exception 'synthetic alternative write failure';
        end if;
        return null;
      end $$`;
    await client`create trigger reject_alternative_write after insert or update or delete on alternative_products for each row execute function reject_alternative_write()`;
  }, 30000);

  beforeEach(async () => {
    await client`truncate alternative_products`;
    await client`insert into alternative_products (id, product_id, alternative_product_id) values ('kept-id', 'source', 'keep'), ('old-id', 'source', 'old')`;
    repository = new PostgresqlAlternativeProductRepository(drizzle(client));
  });

  afterAll(async () => {
    if (client) {
      await client`drop trigger if exists reject_alternative_write on alternative_products`;
      await client`drop function if exists reject_alternative_write()`;
      await client.end({ timeout: 5 });
    }
  });

  describe('공개 대안 정원', () => {
    let productRepository: PostgresqlProductRepository;
    let resolver: ProductQueryResolver;
    let productQueries: string[];
    const manualIds = ['manual-3', 'manual-1', 'missing', 'manual-2', 'manual-4'];
    const autoIds = ['auto-1', 'auto-2', 'auto-3', 'auto-4', 'auto-5', 'auto-6'];
    const publicIds = async () =>
      (
        await resolver.alternatives({
          id: 'source',
          name: 'source',
          slug: 'source',
          summary: '',
          logoUrl: '',
        })
      ).map(product => product.id);

    beforeEach(async () => {
      await client`truncate alternative_products, products, product_tags cascade`;
      for (const id of ['source', ...manualIds.filter(id => id !== 'missing'), ...autoIds]) {
        const publishedAt = id.startsWith('manual')
          ? null
          : new Date(Date.UTC(2026, 0, 10 - Math.max(0, autoIds.indexOf(id)))).toISOString();
        const categoryIds = id.startsWith('manual') ? '[]' : '["shared"]';
        await client`insert into products (id, slug, name, summary, logo_url, published_at, category_ids)
          values (${id}, ${id}, ${id}, '', '', ${publishedAt}, ${categoryIds}::json)`;
      }
      for (const id of manualIds) {
        await client`insert into alternative_products (id, product_id, alternative_product_id) values (${`row-${id}`}, 'source', ${id})`;
      }
      productQueries = [];
      productRepository = new PostgresqlProductRepository(
        drizzle(client, {
          logger: {
            logQuery: query => {
              if (/^select .* from "products" /.test(query)) productQueries.push(query);
            },
          },
        })
      );
      const getAlternativeProductsUseCase = new GetAlternativeProducts(
        repository,
        productRepository,
        new AutoRecommender(productRepository, new PostgresqlProductTagRepository(drizzle(client)))
      );
      // Only the dependencies used by this field are supplied; Lambda verification covers full DI initialization.
      resolver = Object.assign(Object.create(ProductQueryResolver.prototype) as ProductQueryResolver, {
        getAlternativeProductsUseCase,
        getPublishedProductUseCase: new GetPublishedProduct(productRepository),
      });
    });

    it('미발행·부재 수동 5개 대신 공개 자동 후보 5개를 반환하고 존재 여부도 일치한다', async () => {
      const before = await repository.findManyByProductId('source');
      expect(await publicIds()).toEqual(autoIds.slice(0, 5));
      expect(await productRepository.hasPublishedAlternatives('source')).toBe(true);
      expect(await repository.findManyByProductId('source')).toEqual(before);
    });

    it('공개 수동 항목을 먼저 두고 부족한 세 자리만 자동으로 보충한다', async () => {
      await client`update products set published_at = '2026-01-01' where id in ('manual-3', 'manual-1')`;
      expect(await publicIds()).toEqual(['manual-3', 'manual-1', ...autoIds.slice(0, 3)]);
    });

    it('최신 50개 밖의 카테고리 후보도 태그 점수를 반영하고 수동 대안 뒤에 둔다', async () => {
      await client`update products set published_at = '2029-01-01' where id = 'manual-3'`;
      await client`update products set published_at = '2028-01-01' where id = 'source'`;
      await client`update products set published_at = '2027-01-01' where id = 'auto-1'`;
      await client`update products set published_at = '2020-01-01' where id = 'auto-6'`;
      await client`insert into products (id, slug, name, summary, logo_url, published_at, category_ids)
        select 'noise-' || n, 'noise-' || n, 'noise-' || n, '', '', '2026-06-01'::timestamp, '[]'::json
        from generate_series(1, 50) n`;
      await client`insert into tags (id, name, type) values
        ('score-ai', 'score-ai', 'Featured'), ('score-crm', 'score-crm', 'Featured')
        on conflict (name) do nothing`;
      await client`insert into product_tags (id, product_id, tag_id)
        select product_id || '-' || tag_id, product_id, tag_id from (values
          ('source', 'score-ai'), ('source', 'score-crm'),
          ('auto-6', 'score-ai'), ('auto-6', 'score-crm'), ('auto-1', 'score-ai')
        ) fixture(product_id, tag_id)`;

      const recent = await productRepository.findTopNSortByPublishedAtDesc(50);
      expect(recent).toHaveLength(50);
      expect(recent.some(product => product.id === 'auto-6')).toBe(false);
      expect(recent.some(product => product.id === 'auto-1')).toBe(true);
      expect(await publicIds()).toEqual(['manual-3', 'auto-6', 'auto-1', 'auto-2', 'auto-3']);
    });

    it('공개 수동 5개가 있으면 원래 순서를 유지하며 자동 후보를 넣지 않는다', async () => {
      await client`insert into products (id, slug, name, summary, logo_url, published_at)
        values ('missing', 'missing', 'missing', '', '', '2026-01-01')`;
      await client`update products set published_at = '2026-01-01' where id like 'manual-%'`;
      expect(await publicIds()).toEqual(manualIds);
      // One selection/publication check plus one batch of selected product bodies, independent of five results.
      expect(productQueries).toHaveLength(2);
    });

    it('자기 관계가 정원을 차지하지 않으며 공개 수동 항목은 자동 후보와 중복되지 않는다', async () => {
      await client`truncate alternative_products`;
      for (const id of ['source', 'auto-2', 'manual-3', 'auto-1']) {
        await client`insert into alternative_products (id, product_id, alternative_product_id) values (${`row-${id}`}, 'source', ${id})`;
      }
      expect(await publicIds()).toEqual(['auto-2', 'auto-1', 'auto-3', 'auto-4', 'auto-5']);
    });

    it('공개 수동 항목이 5개를 넘어도 최대 5개를 반환한다', async () => {
      await client`truncate alternative_products`;
      for (const id of autoIds) {
        await client`insert into alternative_products (id, product_id, alternative_product_id) values (${`row-${id}`}, 'source', ${id})`;
      }
      expect(await publicIds()).toEqual(autoIds.slice(0, 5));
    });

    it('공개 후보가 없으면 빈 목록이며 자기 관계만으로 존재한다고 표시하지 않는다', async () => {
      await client`update products set published_at = null where id <> 'source'`;
      await client`insert into alternative_products (id, product_id, alternative_product_id) values ('row-self', 'source', 'source')`;
      expect(await publicIds()).toEqual([]);
      expect(await productRepository.hasPublishedAlternatives('source')).toBe(false);
    });
  });

  describe('선정된 공개 대안 본문 일괄 조회', () => {
    const selectedIds = Array.from({ length: 20 }, (_, index) => `batch-${String(20 - index).padStart(2, '0')}`);
    const root = {
      id: 'source',
      slug: 'source',
      name: '원본',
      summary: '',
      logoUrl: '',
    };
    let queries: string[];
    let productRepository: PostgresqlProductRepository;
    let translationService: TranslationService;
    const createResolver = (ids: string[], reader = productRepository) =>
      Object.assign(Object.create(ProductQueryResolver.prototype) as ProductQueryResolver, {
        // Selection is a separate policy with a five-item cap. Exercise hydration at 1/5/20 independently.
        getAlternativeProductsUseCase: {
          execute: async () =>
            ids.map(
              alternativeProductId =>
                new AlternativeProduct({
                  productId: 'source',
                  alternativeProductId,
                })
            ),
        },
        getPublishedProductUseCase: new GetPublishedProduct(reader),
        translationService,
      });
    const productSelects = () => queries.filter(query => /^select .* from "products" /.test(query));

    beforeEach(async () => {
      await client`truncate products, translations cascade`;
      await client`insert into products (id, slug, name, summary, description, logo_url, published_at)
        select 'batch-' || lpad(n::text, 2, '0'), 'batch-' || n, '상품 ' || n,
          '요약 ' || n, '본문 ' || n, '', '2026-01-01'::timestamp from generate_series(1, 20) n`;
      await client`insert into products (id, slug, name, summary, logo_url)
        values ('unpublished', 'unpublished', '미발행', '', '')`;
      queries = [];
      const db = drizzle(client, {
        logger: { logQuery: query => queries.push(query) },
      });
      productRepository = new PostgresqlProductRepository(db);
      translationService = new TranslationService(new PostgresqlTranslationRepository(db));
    });

    it.each([1, 5, 20])('대안 %i개의 본문을 SELECT 한 번으로 읽고 입력 순서를 유지한다', async count => {
      const ids = selectedIds.slice(0, count);
      const result = await createResolver(ids).alternatives(root);
      expect(result.map(product => product.id)).toEqual(ids);
      expect(productSelects()).toHaveLength(1);
    });

    it('없는 상품과 미발행 상품만 제외하고 빈 선정 결과에서는 SQL을 실행하지 않는다', async () => {
      const result = await createResolver(['batch-09', 'missing', 'unpublished', 'batch-02']).alternatives(root);
      expect(result.map(product => product.id)).toEqual(['batch-09', 'batch-02']);
      expect(productSelects()).toHaveLength(1);
      queries.length = 0;
      expect(await createResolver([]).alternatives(root)).toEqual([]);
      expect(queries).toEqual([]);
    });

    it('한영 번역과 필드별 fallback을 유지하고 다음 조회에서 변경·삭제를 바로 읽는다', async () => {
      const translations = new PostgresqlTranslationRepository(drizzle(client));
      await translations.upsertMany([
        {
          entityType: 'Product',
          entityId: 'batch-09',
          locale: 'en',
          field: 'name',
          value: 'Product Nine',
          sourceHash: computeSourceHash('상품 9'),
          model: 'fixture',
          promptVersion: 'fixture',
        },
        {
          entityType: 'Product',
          entityId: 'batch-09',
          locale: 'en',
          field: 'description',
          value: 'Body Nine',
          sourceHash: computeSourceHash('본문 9', 'description'),
          model: 'fixture',
          promptVersion: 'fixture',
        },
        {
          entityType: 'Product',
          entityId: 'batch-02',
          locale: 'en',
          field: 'summary',
          value: 'Stale summary',
          sourceHash: computeSourceHash('이전 요약'),
          model: 'fixture',
          promptVersion: 'fixture',
        },
      ]);
      const resolver = createResolver(['batch-09', 'batch-02']);
      const ko = await resolver.alternatives({ ...root, locale: 'ko' });
      expect(
        ko.map(({ name, summary, description, locale }) => ({
          name,
          summary,
          description,
          locale,
        }))
      ).toEqual([
        {
          name: '상품 9',
          summary: '요약 9',
          description: '본문 9',
          locale: 'ko',
        },
        {
          name: '상품 2',
          summary: '요약 2',
          description: '본문 2',
          locale: 'ko',
        },
      ]);
      queries.length = 0;
      const en = await resolver.alternatives({ ...root, locale: 'en' });
      expect(
        en.map(({ name, summary, description, locale }) => ({
          name,
          summary,
          description,
          locale,
        }))
      ).toEqual([
        {
          name: 'Product Nine',
          summary: '요약 9',
          description: 'Body Nine',
          locale: 'en',
        },
        {
          name: '상품 2',
          summary: '요약 2',
          description: '본문 2',
          locale: 'en',
        },
      ]);
      expect(productSelects()).toHaveLength(1);
      expect(queries.filter(query => /^select .* from "translations" /.test(query))).toHaveLength(1);
      await client`update products set name = '바뀐 상품' where id = 'batch-09'`;
      await client`delete from products where id = 'batch-02'`;
      const fresh = await resolver.alternatives({ ...root, locale: 'en' });
      expect(fresh.map(({ id, name }) => ({ id, name }))).toEqual([{ id: 'batch-09', name: '바뀐 상품' }]);
    });

    it('실제 연결 종료 오류를 정상 빈 목록으로 반환하지 않는다', async () => {
      const closedClient = postgres(url!, { max: 1, connect_timeout: 5 });
      await closedClient`select 1`;
      await closedClient.end({ timeout: 5 });
      const resolver = createResolver(['batch-09'], new PostgresqlProductRepository(drizzle(closedClient)));
      await expect(resolver.alternatives(root)).rejects.toMatchObject({
        cause: { code: 'CONNECTION_ENDED' },
      });
    });
  });

  it('추가 실패 시 삭제를 롤백하고 기존 행 ID와 캐시를 보존한다', async () => {
    const before = await rows();
    const cached = await repository.findManyByProductId('source');
    await expect(update(['keep', 'reject'])).rejects.toMatchObject({
      cause: { message: 'synthetic alternative write failure' },
    });
    expect(await rows()).toEqual(before);
    expect(await repository.findManyByProductId('source')).toEqual(cached);
  });

  it('자기 상품을 포함한 교체는 SQL 쓰기 없이 기존 관계를 보존한다', async () => {
    const before = await rows();
    const queries: string[] = [];
    const loggedRepository = new PostgresqlAlternativeProductRepository(
      drizzle(client, {
        logger: { logQuery: query => queries.push(query) },
      })
    );

    await expect(
      new UpdateAlternativeProduct(loggedRepository).execute({
        productId: 'source',
        alternativeProductIds: ['keep', 'source', 'new'],
      })
    ).rejects.toMatchObject({ code: 'alternative-product/invalid-args' });
    expect(queries.filter(query => /\b(insert|update|delete)\b/i.test(query))).toEqual([]);
    expect(await rows()).toEqual(before);
  });

  it('이미 저장된 자기 관계는 삭제하지 않고 조회 결과에서만 제외한다', async () => {
    await client`insert into alternative_products (id, product_id, alternative_product_id) values ('legacy-self', 'source', 'source')`;
    const before = await rows();

    const result = await new GetAlternativeProducts(repository, {
      findPublishedByIds: async ids =>
        ids.map(
          id =>
            new Product({
              id,
              slug: id,
              name: id,
              summary: '',
              logoUrl: '',
              publishedAt: new Date(),
            })
        ),
    }).execute({
      productId: 'source',
    });

    expect(result.map(row => row.alternativeProductId)).toEqual(['keep', 'old']);
    expect(await rows()).toEqual(before);
  });

  it('유지된 행 ID를 보존하고 중복·빈값을 제거하며 commit 후 캐시를 갱신한다', async () => {
    await repository.findManyByProductId('source');
    await update(['keep', '', 'new', 'new']);
    const result = await rows();
    expect(result.map(row => row.alternative_product_id)).toEqual(['keep', 'new']);
    expect(result[0].id).toBe('kept-id');
    expect((await repository.findManyByProductId('source')).map(row => row.alternativeProductId).sort()).toEqual([
      'keep',
      'new',
    ]);
    await update([]);
    expect(await rows()).toEqual([]);
    expect(await repository.findManyByProductId('source')).toEqual([]);
  });

  it('변경 없는 교체는 행을 다시 쓰지 않는다', async () => {
    const before = await rows();
    // A real DB trigger rejects every write, including delete-and-reinsert implementations.
    const guardedClient = postgres(url!, {
      max: 1,
      connection: { 'darun.reject_all': 'true' },
    });
    try {
      const guardedRepository = new PostgresqlAlternativeProductRepository(drizzle(guardedClient));
      await new UpdateAlternativeProduct(guardedRepository).execute({
        productId: 'source',
        alternativeProductIds: ['old', 'keep', 'keep', ''],
      });
      expect(await rows()).toEqual(before);
    } finally {
      await guardedClient.end({ timeout: 5 });
    }
  });

  it('이전 조회 캐시 대신 잠금 후 최신 DB 목록을 교체한다', async () => {
    await repository.findManyByProductId('source');
    const otherWriter = new PostgresqlAlternativeProductRepository(drizzle(client));
    await new UpdateAlternativeProduct(otherWriter).execute({
      productId: 'source',
      alternativeProductIds: ['keep', 'concurrent'],
    });
    await update(['keep', 'next']);
    expect((await rows()).map(row => row.alternative_product_id)).toEqual(['keep', 'next']);
  });

  it.each([false, true])('같은 상품의 병렬 교체는 한 요청의 완전한 목록이 된다 (빈 목록 시작: %s)', async empty => {
    if (empty) await client`truncate alternative_products`;
    const requests = Array.from({ length: 12 }, (_, index) => ['shared', `choice-${index}`]);
    const results = await Promise.allSettled(
      requests.map(ids => {
        const writer = new PostgresqlAlternativeProductRepository(drizzle(client));
        return new UpdateAlternativeProduct(writer).execute({
          productId: 'source',
          alternativeProductIds: ids,
        });
      })
    );
    expect(results.map(result => result.status)).toEqual(Array(12).fill('fulfilled'));
    const final = (await rows()).map(row => row.alternative_product_id).sort();
    expect(requests.map(ids => [...ids].sort())).toContainEqual(final);
  });
});
