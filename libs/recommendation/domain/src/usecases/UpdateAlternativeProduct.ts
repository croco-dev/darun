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

  async exclude(productId: string, alternativeProductId: string, note: string | null) {
    if (productId === alternativeProductId) {
      throw createDomainError('alternative-product/invalid-args', '자기 상품은 자동 대안에서 제외할 수 없습니다.');
    }

    if (note && note.length > 500) {
      throw createDomainError('alternative-product/invalid-args', '제외 메모는 500자 이하로 입력해 주세요.');
    }

    await this.alternativeProductRepository.exclude({
      productId,
      alternativeProductId,
      note: note?.trim() ? note : null,
    });
  }

  async restore(productId: string, alternativeProductId: string) {
    await this.alternativeProductRepository.restore(productId, alternativeProductId);
  }
}
