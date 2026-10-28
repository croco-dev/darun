import { describe, expect, it, vi } from 'vitest';
import type { AlternativeProductRepository } from '../repositories/AlternativeProductRepository';
import { UpdateAlternativeProduct } from '../usecases/UpdateAlternativeProduct';

describe('UpdateAlternativeProduct', () => {
  it('자기 상품이 포함된 요청은 기존 목록을 교체하지 않고 입력 오류로 거절한다', async () => {
    const repository: AlternativeProductRepository = {
      replaceByProductId: vi.fn(),
      findManyByProductId: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    };

    await expect(
      new UpdateAlternativeProduct(repository).execute({
        productId: 'source',
        alternativeProductIds: ['keep', 'source', 'new'],
      })
    ).rejects.toMatchObject({ code: 'alternative-product/invalid-args' });
    expect(repository.replaceByProductId).not.toHaveBeenCalled();
  });

  it('전체 목록을 원자적 교체 경계에 전달하고 실패를 전파한다', async () => {
    const replaceByProductId = vi.fn<AlternativeProductRepository['replaceByProductId']>().mockResolvedValue();
    const repository: AlternativeProductRepository = {
      replaceByProductId,
      findManyByProductId: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    };
    const usecase = new UpdateAlternativeProduct(repository);
    await usecase.execute({ productId: 'source', alternativeProductIds: ['keep', '', 'new', 'new'] });
    expect(replaceByProductId).toHaveBeenCalledExactlyOnceWith('source', ['keep', '', 'new', 'new']);
    replaceByProductId.mockRejectedValueOnce(new Error('replacement failed'));
    await expect(usecase.execute({ productId: 'source', alternativeProductIds: [] })).rejects.toThrow(
      'replacement failed'
    );
  });
});
