import 'reflect-metadata';
import { Product } from '@darun/products-domain';
import type { Drizzle } from '@darun/provider-database';
import { DrizzleQueryError } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';
import { PostgresqlProductRepository } from '../repositories/PostgresqlProductRepository';
import { PostgresqlProductResearchMaterializationRepository } from '../repositories/PostgresqlProductResearchMaterializationRepository';

const pgConflict = () =>
  Object.assign(new Error('private DB detail'), {
    code: '23505',
    constraint_name: 'products_slug_unique',
  });
const wrapped = (cause: Error) => new DrizzleQueryError('insert private SQL', ['private parameter'], cause);

describe.each(['수동 생성', '조사 등록'] as const)('%s의 PostgreSQL slug 충돌', kind => {
  function write(error: unknown) {
    const db = {
      transaction: vi.fn().mockRejectedValue(error),
    } as unknown as Drizzle;
    return kind === '수동 생성'
      ? new PostgresqlProductRepository(db).insert(
          new Product({
            name: '제품',
            slug: 'product',
            summary: '요약',
            logoUrl: 'https://example.com/logo.png',
          })
        )
      : new PostgresqlProductResearchMaterializationRepository(db).materialize({
          researchJobId: 'job',
          name: '제품',
          slug: 'product',
          summary: '요약',
          logoUrl: 'https://example.com/logo.png',
          officialUrl: 'https://example.com/',
          officialUrlConfirmed: false,
          categoryIds: [],
          features: [],
          tags: [],
        });
  }

  it.each<[string, () => Error]>([
    ['직접 PG 오류', () => pgConflict()],
    ['실제 Drizzle wrapper', () => wrapped(pgConflict())],
    ['중첩 wrapper', () => wrapped(wrapped(pgConflict()))],
    [
      'node-postgres 제약 이름',
      () =>
        Object.assign(new Error('private'), {
          code: '23505',
          constraint: 'products_slug_unique',
        }),
    ],
  ])('%s를 SQL과 parameter 없는 도메인 오류로 반환한다', async (_name, error) => {
    const result = await write(error()).catch((caught: unknown) => caught);
    expect(result).toMatchObject({ code: 'product/slug-already-exists' });
    expect(result).toHaveProperty('cause', undefined);
    expect(String(result)).not.toContain('private');
  });

  it.each<[string, () => unknown]>([
    ['다른 unique 제약', () => Object.assign(pgConflict(), { constraint_name: 'products_pkey' })],
    [
      'wrapper 안 다른 unique 제약',
      () =>
        wrapped(
          Object.assign(pgConflict(), {
            constraint_name: 'tags_name_unique',
          })
        ),
    ],
    ['제약 정보 없는 unique 오류', () => ({ code: '23505' })],
    ['연결 오류', () => Object.assign(pgConflict(), { code: '08006' })],
    ['문자열 오류', () => '23505 products_slug_unique'],
    [
      '순환 cause',
      () => {
        const error = new Error('cycle');
        return Object.assign(error, { cause: error });
      },
    ],
    [
      '과도하게 깊은 cause',
      () => {
        let error: Error = pgConflict();
        for (let i = 0; i < 20; i += 1)
          error = Object.assign(new Error('wrapper'), {
            cause: error,
          });
        return error;
      },
    ],
  ])('%s를 slug 중복으로 바꾸지 않는다', async (_name, createError) => {
    const error = createError();
    await expect(write(error)).rejects.toBe(error);
  });
});
