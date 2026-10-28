import 'reflect-metadata';
import { GetProductsByCategory } from '@darun/products-domain';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { PostgresqlCategoryRepository } from '../repositories/PostgresqlCategoryRepository';
import { PostgresqlProductRepository } from '../repositories/PostgresqlProductRepository';

const url = process.env.CATEGORY_COUNT_TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite('카테고리 건수 지연 조회 (격리 PostgreSQL 필요)', () => {
  let sql: postgres.Sql;
  let useCase: GetProductsByCategory;
  let fixturesInserted = false;
  const queries: string[] = [];

  beforeAll(async () => {
    const target = new URL(url!);
    if (
      !['localhost', '127.0.0.1'].includes(target.hostname) ||
      target.pathname !== '/darun_category_count' ||
      !['postgres:', 'postgresql:'].includes(target.protocol) ||
      target.search ||
      target.hash
    ) {
      throw new Error('Requires isolated local darun_category_count database');
    }
    sql = postgres(url!, { max: 1, connect_timeout: 5 });
    const db = drizzle(sql, {
      logger: { logQuery: query => queries.push(query) },
    });
    await migrate(db, {
      migrationsFolder: resolve(__dirname, '../../../../../apps/graphql-api/scripts/migrations'),
    });
    await sql.begin(async tx => {
      await tx.unsafe(
        "INSERT INTO categories (id, slug, label_ko, label_en) VALUES ('count-tools', 'count-tools', '도구', 'Tools')"
      );
      await tx.unsafe(`INSERT INTO products (id, slug, name, summary, logo_url, category_ids, published_at) VALUES
      ('count-p3', 'count-p3', 'Third', 'summary', '', '["count-tools"]', NOW()),
      ('count-p2', 'count-p2', 'Second', 'summary', '', '["count-tools","other"]', NOW()),
      ('count-p1', 'count-p1', 'First', 'summary', '', '["count-tools"]', NOW()),
      ('count-draft', 'count-draft', 'Draft', 'summary', '', '["count-tools"]', NULL),
      ('count-other', 'count-other', 'Other', 'summary', '', '["other"]', NOW())`);
    });
    fixturesInserted = true;
    useCase = new GetProductsByCategory(new PostgresqlProductRepository(db), new PostgresqlCategoryRepository(db));
    queries.length = 0;
  }, 30_000);

  afterAll(async () => {
    if (sql) {
      try {
        if (fixturesInserted) {
          await sql`DELETE FROM products WHERE id IN ('count-p3', 'count-p2', 'count-p1', 'count-draft', 'count-other')`;
          await sql`DELETE FROM categories WHERE id = 'count-tools'`;
        }
      } finally {
        await sql.end({ timeout: 5 });
      }
    }
  });

  it('집계 없이 페이지를 읽고 선택된 전체 건수는 발행·카테고리 조건만 적용한다', async () => {
    const page = await useCase.execute({ slug: 'count-tools', limit: 2 });
    expect(page.products.map(product => product.id)).toEqual(['count-p3', 'count-p2']);
    expect(queries.filter(query => /\bcount\(/i.test(query))).toHaveLength(0);
    const next = await useCase.execute({
      slug: 'count-tools',
      limit: 2,
      afterId: 'count-p2',
    });
    expect(next.products.map(product => product.id)).toEqual(['count-p1']);
    expect(queries.filter(query => /\bcount\(/i.test(query))).toHaveLength(0);
    expect(await Promise.all([next.getTotalCount(), next.getTotalCount()])).toEqual([3, 3]);
    expect(queries.filter(query => /\bcount\(/i.test(query))).toHaveLength(1);
  });
});
