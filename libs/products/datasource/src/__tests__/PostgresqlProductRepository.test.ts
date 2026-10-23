import 'reflect-metadata';
import type { Drizzle } from '@darun/provider-database';
import { describe, expect, it, vi } from 'vitest';
import { PostgresqlProductRepository } from '../repositories/PostgresqlProductRepository';

const row = (name: string) => ({
  id: 'product-1',
  name,
  slug: 'product-1',
  summary: 'Summary',
  logoUrl: 'logo.png',
  categoryIds: [],
  publishedAt: new Date('2026-01-01'),
  createdAt: new Date('2026-01-01'),
});

describe('PostgresqlProductRepository reads', () => {
  it('batches covers and screenshot counts for 24 apps with ordered missing-key mapping', async () => {
    const selectDistinctOn = vi.fn(() => ({
      from: () => ({
        where: () => ({
          orderBy: async () => [
            {
              id: 'cover',
              productId: 'app-17',
              imageUrl: 'cover.png',
              imageAlt: 'Cover',
              platform: 'WEB',
              screenType: 'HOME',
              title: null,
            },
          ],
        }),
      }),
    }));
    let screenshotCount = 4000;
    const select = vi.fn(() => ({
      from: () => ({
        where: () => ({
          groupBy: async () => [{ productId: 'app-17', value: screenshotCount }],
        }),
      }),
    }));
    const repo = new PostgresqlProductRepository({ selectDistinctOn, select } as unknown as Drizzle);
    const ids = Array.from({ length: 24 }, (_, index) => `app-${index}`);
    const [covers, counts] = await Promise.all([
      Promise.all(ids.map(id => repo.findVisualAppCover(id))),
      Promise.all(ids.map(id => repo.countVisualAppScreenshots(id))),
    ]);
    expect(selectDistinctOn).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenCalledTimes(1);
    expect(covers.filter(Boolean)).toHaveLength(1);
    expect(covers[17]?.imageUrl).toBe('cover.png');
    expect(counts[17]).toBe(4000);
    expect(counts[0]).toBe(0);
    screenshotCount = 4001;
    expect(await repo.countVisualAppScreenshots('app-17')).toBe(4001);
  });
  it('does not retain stale id-loader data after an external transaction changes a product', async () => {
    let current = row('Before');
    const select = vi.fn(() => ({ from: () => ({ where: async () => [current] }) }));
    const repo = new PostgresqlProductRepository({ select } as unknown as Drizzle);
    expect((await repo.findOneById('product-1'))?.name).toBe('Before');
    current = row('After');
    expect((await repo.findOneById('product-1'))?.name).toBe('After');
  });
  it('preserves published batch key order and missing entries', async () => {
    const select = vi.fn(() => ({ from: () => ({ where: async () => [row('Published')] }) }));
    const repo = new PostgresqlProductRepository({ select } as unknown as Drizzle);
    const result = await repo.findPublishedByIds(['missing', 'product-1', 'product-1']);
    expect(result.map(product => product?.name ?? null)).toEqual([null, 'Published', 'Published']);
  });
});
