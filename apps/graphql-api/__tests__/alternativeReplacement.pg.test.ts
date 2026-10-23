import 'reflect-metadata';
import { PostgresqlAlternativeProductRepository } from '@darun/recommendation-datasource';
import { UpdateAlternativeProduct } from '@darun/recommendation-domain';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres, { type Sql } from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';

const url = process.env.ALTERNATIVE_TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite('대안 교체 PostgreSQL 무결성 (ALTERNATIVE_TEST_DATABASE_URL 필요)', () => {
  let client: Sql;
  let repository: PostgresqlAlternativeProductRepository;
  const update = (ids: string[], productId = 'source') =>
    new UpdateAlternativeProduct(repository).execute({ productId, alternativeProductIds: ids });
  const rows = () =>
    client`select id, alternative_product_id from alternative_products where product_id = 'source' order by alternative_product_id`;

  beforeAll(async () => {
    const target = new URL(url!);
    if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.pathname !== '/darun_alternative_integrity') {
      throw new Error('Requires isolated local darun_alternative_integrity database');
    }
    client = postgres(url!, { max: 12, connect_timeout: 5 });
    await migrate(drizzle(client), { migrationsFolder: resolve(__dirname, '../scripts/migrations') });
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

  it('추가 실패 시 삭제를 롤백하고 기존 행 ID와 캐시를 보존한다', async () => {
    const before = await rows();
    const cached = await repository.findManyByProductId('source');
    await expect(update(['keep', 'reject'])).rejects.toMatchObject({
      cause: { message: 'synthetic alternative write failure' },
    });
    expect(await rows()).toEqual(before);
    expect(await repository.findManyByProductId('source')).toEqual(cached);
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
    const guardedClient = postgres(url!, { max: 1, connection: { 'darun.reject_all': 'true' } });
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
        return new UpdateAlternativeProduct(writer).execute({ productId: 'source', alternativeProductIds: ids });
      })
    );
    expect(results.map(result => result.status)).toEqual(Array(12).fill('fulfilled'));
    const final = (await rows()).map(row => row.alternative_product_id).sort();
    expect(requests.map(ids => [...ids].sort())).toContainEqual(final);
  });
});
