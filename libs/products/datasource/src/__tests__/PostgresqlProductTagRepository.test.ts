import 'reflect-metadata';
import type { Drizzle } from '@darun/provider-database';
import { describe, expect, it, vi } from 'vitest';
import { PostgresqlProductTagRepository } from '../repositories/PostgresqlProductTagRepository';

describe('PostgresqlProductTagRepository batching', () => {
  it('batches 30 selected tag lookups, preserving healthy and absent product entries', async () => {
    const select = vi.fn(() => ({
      from: () => ({
        innerJoin: () => ({
          where: async () => [
            {
              product_tags: { productId: 'p17' },
              tags: { id: 'tag', name: 'Useful', type: 'Simple', count: 1 },
            },
          ],
        }),
      }),
    }));
    const repository = new PostgresqlProductTagRepository({ select } as unknown as Drizzle);
    const results = await Promise.all(
      Array.from({ length: 30 }, (_, index) => repository.findOneByProductId(`p${index}`))
    );
    expect(select).toHaveBeenCalledTimes(1);
    expect(results[17]?.tags.map(tag => tag.name)).toEqual(['Useful']);
    expect(results.filter(Boolean)).toHaveLength(1);
  });
});
