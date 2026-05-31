import { Inject, Service } from 'typedi';
import type { AlternativeProductRepository } from '../repositories/AlternativeProductRepository';
import { AlternativeProductRepositoryToken } from '../repositories/AlternativeProductRepository';
import { AutoRecommender } from '../services/AutoRecommender';

const DEFAULT_ALTERNATIVE_LIMIT = 5;

@Service()
export class GetAlternativeProducts {
  constructor(
    @Inject(AlternativeProductRepositoryToken)
    private readonly alternativeProductRepository: AlternativeProductRepository,
    private readonly autoRecommender?: AutoRecommender
  ) {}

  async execute({ productId }: { productId: string }) {
    const manualAlternatives = await this.alternativeProductRepository.findManyByProductId(productId);
    if (manualAlternatives.length >= DEFAULT_ALTERNATIVE_LIMIT || !this.autoRecommender) {
      return manualAlternatives;
    }

    const automaticAlternatives = await this.autoRecommender.recommend({
      productId,
      excludeProductIds: manualAlternatives.map(alternative => alternative.alternativeProductId),
      limit: DEFAULT_ALTERNATIVE_LIMIT - manualAlternatives.length,
    });

    return [...manualAlternatives, ...automaticAlternatives];
  }
}
