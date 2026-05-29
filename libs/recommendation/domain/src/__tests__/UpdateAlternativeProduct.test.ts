import { describe, expect, it, vi } from 'vitest';
import { AlternativeProduct } from '../entities/AlternativeProduct';
import type { AlternativeProductRepository } from '../repositories/AlternativeProductRepository';
import { UpdateAlternativeProduct } from '../usecases/UpdateAlternativeProduct';

describe('UpdateAlternativeProduct', () => {
  const createRepository = (prevAlternatives: AlternativeProduct[] = []) =>
    ({
      findManyByProductId: vi.fn<AlternativeProductRepository['findManyByProductId']>().mockResolvedValue(prevAlternatives),
      create: vi.fn<AlternativeProductRepository['create']>(),
      deleteMany: vi.fn<AlternativeProductRepository['deleteMany']>().mockResolvedValue(true),
      createMany: vi.fn<AlternativeProductRepository['createMany']>().mockResolvedValue([]),
    }) satisfies AlternativeProductRepository;

  it('keeps existing alternatives without unnecessary writes', async () => {
    const repository = createRepository([
      new AlternativeProduct({ id: 'alt-1', productId: 'product-1', alternativeProductId: 'product-2' }),
      new AlternativeProduct({ id: 'alt-2', productId: 'product-1', alternativeProductId: 'product-3' }),
    ]);

    await new UpdateAlternativeProduct(repository).execute({
      productId: 'product-1',
      alternativeProductIds: ['product-2', '', 'product-3', 'product-2'],
    });

    expect(repository.findManyByProductId).toHaveBeenCalledOnce();
    expect(repository.findManyByProductId).toHaveBeenCalledWith('product-1');
    expect(repository.createMany).not.toHaveBeenCalled();
    expect(repository.deleteMany).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('writes only the set difference for changed alternatives', async () => {
    const removedAlternative = new AlternativeProduct({
      id: 'alt-removed',
      productId: 'product-1',
      alternativeProductId: 'product-2',
    });
    const keptAlternative = new AlternativeProduct({
      id: 'alt-kept',
      productId: 'product-1',
      alternativeProductId: 'product-3',
    });
    const repository = createRepository([removedAlternative, keptAlternative]);

    await new UpdateAlternativeProduct(repository).execute({
      productId: 'product-1',
      alternativeProductIds: ['product-3', 'product-4'],
    });

    expect(repository.deleteMany).toHaveBeenCalledWith([removedAlternative]);
    expect(repository.createMany).toHaveBeenCalledWith([
      new AlternativeProduct({ productId: 'product-1', alternativeProductId: 'product-4' }),
    ]);
    expect(repository.create).not.toHaveBeenCalled();
  });
});
