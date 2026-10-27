import 'reflect-metadata';
import { ProductFeature, ProductFlow, ProductLink, ProductScreenshot, ProductTag, Tag } from '@darun/products-domain';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PostgresqlCategoryRepository } from '../repositories/PostgresqlCategoryRepository';
import { PostgresqlProductFeatureRepository } from '../repositories/PostgresqlProductFeatureRepository';
import { PostgresqlProductFlowRepository } from '../repositories/PostgresqlProductFlowRepository';
import { PostgresqlProductLinkRepository } from '../repositories/PostgresqlProductLinkRepository';
import { PostgresqlProductRepository } from '../repositories/PostgresqlProductRepository';
import { PostgresqlProductScreenshotRepository } from '../repositories/PostgresqlProductScreenshotRepository';
import { PostgresqlProductTagRepository } from '../repositories/PostgresqlProductTagRepository';

const finish = vi.hoisted(() => vi.fn());
vi.mock('../repositories/productContentSync', () => ({
  beginProductContentWrite: vi.fn(async (_tx: unknown, productId: string) => {
    expect(productId).toBe('product-1');
    return finish;
  }),
  ProductContentSyncRegistrarToken: class ProductContentSyncRegistrarToken {},
}));
vi.mock('dataloader', () => ({
  default: class {
    load = vi.fn();
    clear = vi.fn();
    clearAll = vi.fn();
  },
}));

function transaction(rows: Record<string, unknown>[]) {
  const chain = Object.assign(Promise.resolve(rows), {
    from: vi.fn(),
    innerJoin: vi.fn(),
    for: vi.fn(),
    limit: vi.fn(),
    orderBy: vi.fn(),
    where: vi.fn(),
    returning: vi.fn().mockResolvedValue(rows),
    onConflictDoNothing: vi.fn(),
  });
  for (const method of [
    chain.from,
    chain.innerJoin,
    chain.for,
    chain.limit,
    chain.orderBy,
    chain.where,
    chain.onConflictDoNothing,
  ]) {
    method.mockReturnValue(chain);
  }
  return {
    execute: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue(chain) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue(chain) }),
    delete: vi.fn().mockReturnValue(chain),
    select: vi.fn().mockReturnValue(chain),
    query: chain,
  };
}
function fixture(rows: Record<string, unknown>[]) {
  const tx = transaction(rows);
  return {
    tx,
    db: {
      transaction: vi.fn(async (work: (value: typeof tx) => Promise<unknown>) => work(tx)),
    },
  };
}

describe('canonical Product source transactions reserve publication sync checkpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    finish.mockReset();
  });

  interface DatabaseFixture {
    db: unknown;
  }
  it.each([
    [
      'Product edit',
      (database: DatabaseFixture) =>
        new PostgresqlProductRepository(database.db as never).updateById('product-1', value => {
          value.update({ name: '새 이름' });
          return value;
        }),
    ],
    [
      'Feature insert',
      (database: DatabaseFixture) =>
        new PostgresqlProductFeatureRepository(database.db as never).insert(
          new ProductFeature({
            id: 'feature-1',
            productId: 'product-1',
            name: '기능',
            emoji: '🔎',
          })
        ),
    ],
    [
      'Tag update',
      (database: DatabaseFixture) =>
        new PostgresqlProductTagRepository(database.db as never).upsert(
          new ProductTag({
            productId: 'product-1',
            tags: [new Tag({ name: '태그' })],
          })
        ),
    ],
    [
      'Link insert',
      (database: DatabaseFixture) =>
        new PostgresqlProductLinkRepository(database.db as never).insert(
          new ProductLink({
            id: 'link-1',
            productId: 'product-1',
            title: '링크',
            link: 'https://example.com',
            displayLink: 'example.com',
            iconUrl: 'icon',
          })
        ),
    ],
    [
      'Screenshot insert',
      (database: DatabaseFixture) =>
        new PostgresqlProductScreenshotRepository(database.db as never).insert(
          new ProductScreenshot({
            id: 'shot-1',
            productId: 'product-1',
            imageUrl: 'https://example.com/image.png',
            imageAlt: '화면',
          })
        ),
    ],
    [
      'Flow insert',
      (database: DatabaseFixture) =>
        new PostgresqlProductFlowRepository(database.db as never).insert(
          new ProductFlow({
            id: 'flow-1',
            productId: 'product-1',
            title: '흐름',
            description: '설명',
            platform: 'WEB',
            flowType: 'OTHER',
            steps: [],
          }),
          () => {}
        ),
    ],
  ] as const)('%s must finish its content checkpoint before commit', async (_name, run) => {
    const sourceFixture = fixture([{ id: 'product-1' }]);
    await run(sourceFixture);
    expect(finish).toHaveBeenCalledOnce();
  });

  it('Category label updates finish a checkpoint for every referenced Product in sorted order', async () => {
    const categoryFixture = fixture([{ id: 'product-1' }]);
    const category = { id: 'category-1', labelKo: '기존', labelEn: 'Previous' };
    const categoryQuery = transaction([category]).query;
    categoryFixture.tx.select.mockReturnValueOnce(categoryFixture.tx.query).mockReturnValueOnce(categoryQuery);
    categoryFixture.tx.query.returning.mockResolvedValue([category]);
    await new PostgresqlCategoryRepository(categoryFixture.db as never).updateById('category-1', value => value);
    expect(finish).toHaveBeenCalledOnce();
  });

  it('Product source writers cannot commit content before the sync checkpoint', async () => {
    const sourceFixture = fixture([{ id: 'product-1' }]);
    let sawFinishedContentWrite = false;
    finish.mockImplementationOnce(async () => {
      sawFinishedContentWrite = sourceFixture.tx.query.returning.mock.calls.length > 0;
      throw new Error('intent checkpoint rejected');
    });
    await expect(
      new PostgresqlProductRepository(sourceFixture.db as never).updateById('product-1', value => {
        value.update({ name: '실패 값' });
        return value;
      })
    ).rejects.toThrow('intent checkpoint rejected');
    expect(sawFinishedContentWrite).toBe(true);
  });
});
