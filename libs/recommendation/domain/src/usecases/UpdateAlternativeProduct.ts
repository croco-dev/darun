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
    await this.alternativeProductRepository.replaceByProductId(productId, alternativeProductIds);
  }
}
