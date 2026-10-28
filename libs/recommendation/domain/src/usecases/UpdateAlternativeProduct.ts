import { createDomainError } from '@darun/utils-error';
import { Inject, Service } from 'typedi';
import type { AlternativeProductRepository } from '../repositories/AlternativeProductRepository';
import { AlternativeProductRepositoryToken } from '../repositories/AlternativeProductRepository';

@Service()
export class UpdateAlternativeProduct {
  constructor(
    @Inject(AlternativeProductRepositoryToken)
    private readonly alternativeProductRepository: AlternativeProductRepository
  ) {}

  async execute({ productId, alternativeProductIds }: { productId: string; alternativeProductIds: string[] }) {
    if (alternativeProductIds.includes(productId)) {
      throw createDomainError('alternative-product/invalid-args', '자기 상품을 대안으로 선택할 수 없습니다.');
    }

    await this.alternativeProductRepository.replaceByProductId(productId, alternativeProductIds);
  }
}
