import 'reflect-metadata';
import { inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { products } from '../entities/ProductSchema';
import { productScreenshots } from '../entities/ProductScreenshotsSchema';
import { PostgresqlProductRepository } from '../repositories/PostgresqlProductRepository';

const url = process.env.VISUAL_APP_SEARCH_TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
const fixtures = [
  { id: '526-a', name: '달력 도구', slug: 'calendar-tool' },
  { id: '526-b', name: 'Calendar Desktop', slug: 'calendar-desktop' },
  { id: '526-c', name: '일정 공유', slug: 'shared-calendar' },
  { id: '526-d', name: '미발행', slug: 'calendar-draft', publishedAt: null },
  { id: '526-e', name: '화면 없음', slug: 'calendar-no-screen' },
  { id: '526-f', name: '특수문자', slug: 'literal%_\\tool' },
  { id: '526-g', name: '와일드카드 대조', slug: 'literalXYtool' },
  { id: '526-h', name: 'name%_\\literal', slug: 'name-literal' },
  { id: '526-i', name: 'nameXYliteral', slug: 'name-wildcard-control' },
];
const ids = fixtures.map(row => row.id);

suite('Visual 앱 이름·slug 검색 (격리 PostgreSQL 필요)', () => {
  let sql: postgres.Sql;
  let db: ReturnType<typeof drizzle>;
  let repo: PostgresqlProductRepository;

  beforeAll(async () => {
    const target = new URL(url!);
    if (
      !['localhost', '127.0.0.1'].includes(target.hostname) ||
      target.pathname !== '/darun_visual_app_search' ||
      !['postgres:', 'postgresql:'].includes(target.protocol) ||
      target.search ||
      target.hash
    ) {
      throw new Error('Requires isolated local darun_visual_app_search database');
    }
    sql = postgres(url!, { max: 1, connect_timeout: 5 });
    db = drizzle(sql);
    repo = new PostgresqlProductRepository(db);
    await migrate(db, {
      migrationsFolder: resolve(__dirname, '../../../../../apps/graphql-api/scripts/migrations'),
    });
    await db.transaction(async tx => {
      await tx.insert(products).values(
        fixtures.map(row => ({
          summary: '',
          logoUrl: '',
          publishedAt: new Date('2026-01-01T00:00:00Z'),
          ...row,
        }))
      );
      await tx
        .insert(productScreenshots)
        .values(
          fixtures
            .filter(row => row.id !== '526-e')
            .map(row => ({ id: `${row.id}-shot`, productId: row.id, imageUrl: 'fixture.png', imageAlt: row.name }))
        );
      // Multiple screenshots must not duplicate the app or inflate its count.
      await tx.insert(productScreenshots).values({
        id: '526-a-second-shot',
        productId: '526-a',
        imageUrl: 'second.png',
        imageAlt: '두 번째 화면',
      });
    });
  }, 30_000);

  afterAll(async () => {
    try {
      if (db) {
        await db.transaction(async tx => {
          await tx.delete(productScreenshots).where(inArray(productScreenshots.productId, ids));
          await tx.delete(products).where(inArray(products.id, ids));
        });
      }
    } finally {
      await sql?.end({ timeout: 5 });
    }
  });

  it.each(['달력 도구', 'calendar-tool', 'ENDAR-TO'])('%s로 이름이 다른 앱을 찾는다', async query => {
    const result = await repo.findVisualApps({ query, limit: 24 });
    expect(result.products.map(product => product.id)).toEqual(['526-a']);
    expect(result.total).toBe(1);
  });

  it.each(['%', '_', '\\', '%_\\'])('%s를 이름과 slug에서 리터럴로 검색한다', async query => {
    const result = await repo.findVisualApps({ query, limit: 24 });
    expect(result.products.map(product => product.id)).toEqual(['526-h', '526-f']);
    expect(result.total).toBe(2);
  });

  it('공개·화면 존재 조건과 내림차순 페이지 경계를 목록·전체 건수에 유지한다', async () => {
    const first = await repo.findVisualApps({ query: 'calendar', limit: 2 });
    expect(first.products.map(product => product.id)).toEqual(['526-c', '526-b']);
    expect(first.total).toBe(3);
    const next = await repo.findVisualApps({ query: 'calendar', limit: 2, afterId: '526-b' });
    expect(next.products.map(product => product.id)).toEqual(['526-a']);
    expect(next.total).toBe(3);
  });

  it('정확한 상품 필터와 검색 조건을 함께 적용한다', async () => {
    const match = await repo.findVisualApps({ query: 'calendar', productSlug: 'calendar-tool', limit: 24 });
    expect(match.products.map(product => product.id)).toEqual(['526-a']);
    expect(match.total).toBe(1);
    expect(await repo.findVisualApps({ query: 'calendar', productSlug: 'name-literal', limit: 24 })).toEqual({
      products: [],
      total: 0,
    });
  });
});
