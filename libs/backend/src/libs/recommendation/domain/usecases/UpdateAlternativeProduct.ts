import { Inject, Service } from 'typedi';
import { AlternativeProduct } from '../entities/AlternativeProduct';
import {
  AlternativeProductRepository,
  AlternativeProductRepositoryToken,
} from '../repositories/AlternativeProductRepository';

@Service()
export class UpdateAlternativeProduct {
  constructor(
    @Inject(AlternativeProductRepositoryToken) private alternativeProductRepository: AlternativeProductRepository
  ) {}

  async execute({ productId, alternativeProductIds }: { productId: string; alternativeProductIds: string[] }) {
    const prevAlternatives = await this.alternativeProductRepository.findManyByProductId(productId);
    const removedAlternatives = prevAlternatives.filter(
      prevAlternative => !alternativeProductIds.includes(prevAlternative.id)
    );
    const addedAlternatives = alternativeProductIds.filter(
      alternativeProductId =>
        !prevAlternatives.map(prevAlternative => prevAlternative.id).includes(alternativeProductId)
    );

    await this.alternativeProductRepository.deleteMany(removedAlternatives);
    await this.alternativeProductRepository.createMany(
      addedAlternatives.map(alternativeProductId => new AlternativeProduct({ productId, alternativeProductId }))
    );
  }
}
