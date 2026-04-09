import { Inject, Service } from 'typedi';
import { AlternativeProduct } from '../entities/AlternativeProduct';
import type { AlternativeProductRepository } from '../repositories/AlternativeProductRepository';
import { AlternativeProductRepositoryToken } from '../repositories/AlternativeProductRepository';

@Service()
export class UpdateAlternativeProduct {
  constructor(
    @Inject(AlternativeProductRepositoryToken)
    private readonly alternativeProductRepository: AlternativeProductRepository
  ) {}

  async execute({ productId, alternativeProductIds }: { productId: string; alternativeProductIds: string[] }) {
    const normalizedAlternativeProductIds = [...new Set(alternativeProductIds.filter(Boolean))];
    const nextAlternativeProductIdSet = new Set(normalizedAlternativeProductIds);
    const prevAlternatives = await this.alternativeProductRepository.findManyByProductId(productId);
    const prevAlternativeProductIdSet = new Set(
      prevAlternatives.map(prevAlternative => prevAlternative.alternativeProductId)
    );

    const removedAlternatives = prevAlternatives.filter(
      prevAlternative => !nextAlternativeProductIdSet.has(prevAlternative.alternativeProductId)
    );
    const addedAlternatives = normalizedAlternativeProductIds.filter(
      alternativeProductId => !prevAlternativeProductIdSet.has(alternativeProductId)
    );

    if (removedAlternatives.length > 0) {
      await this.alternativeProductRepository.deleteMany(removedAlternatives);
    }

    if (addedAlternatives.length > 0) {
      await this.alternativeProductRepository.createMany(
        addedAlternatives.map(alternativeProductId => new AlternativeProduct({ productId, alternativeProductId }))
      );
    }
  }
}
