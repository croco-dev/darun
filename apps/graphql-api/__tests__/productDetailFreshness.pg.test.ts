import 'reflect-metadata';
import {
  PostgresqlProductFeatureRepository,
  PostgresqlProductFeatureScreenshotRepository,
  PostgresqlProductLinkRepository,
  PostgresqlProductScreenshotRepository,
} from '@darun/products-datasource';
import type { Drizzle } from '@darun/provider-database';
import { PostgresqlAlternativeProductRepository } from '@darun/recommendation-datasource';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres, { type Sql } from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';

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
});
