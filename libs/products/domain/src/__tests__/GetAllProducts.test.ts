import { describe, expect, it, vi } from 'vitest';
import type { ProductRepository } from '../repositories/ProductRepository';
import { GetAllProducts } from '../usecases/GetAllProducts';
import { createMockRepository } from './productRepositoryMock';

function repository(): ProductRepository {
  return {
    ...createMockRepository(),
    findAllByBeforeIdAndLimit: vi.fn().mockResolvedValue([]),
    findAllByAfterIdAndLimit: vi.fn().mockResolvedValue([]),
    countAll: vi.fn().mockResolvedValue(42),
  };
}

describe('GetAllProducts', () => {
  it('reads only the requested page and total, without priming individual products', async () => {
    const repo = repository();
    const result = await new GetAllProducts(repo).execute({ limit: 30, cursor: { id: 'cursor' } });
    expect(repo.findAllByAfterIdAndLimit).toHaveBeenCalledWith(30, 'cursor');
    expect(repo.findOneById).not.toHaveBeenCalled();
    expect(result).toEqual({ products: [], total: 42 });
  });
  it('preserves reverse pagination arguments', async () => {
    const repo = repository();
    await new GetAllProducts(repo).execute({ limit: 10, cursor: { id: 'cursor' }, type: 'before' });
    expect(repo.findAllByBeforeIdAndLimit).toHaveBeenCalledWith(10, 'cursor');
    expect(repo.findAllByAfterIdAndLimit).not.toHaveBeenCalled();
  });
});
