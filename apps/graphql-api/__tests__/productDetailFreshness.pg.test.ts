import 'reflect-metadata';
import {
  PostgresqlProductFeatureRepository,
  PostgresqlProductFeatureScreenshotRepository,
  PostgresqlProductFlowRepository,
  PostgresqlProductLinkRepository,
  PostgresqlProductScreenshotRepository,
} from '@darun/products-datasource';
import type { Drizzle } from '@darun/provider-database';
import { PostgresqlAlternativeProductRepository } from '@darun/recommendation-datasource';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres, { type Sql } from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
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
});
