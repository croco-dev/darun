import { Inject, Service } from 'typedi';
import { AlternativeProduct } from '../entities/AlternativeProduct';
import {
  AlternativeProductRepository,
  AlternativeProductRepositoryToken,
} from '../repositories/AlternativeProductRepository';

@Service()
export class AddAlternativeProduct {
  constructor(
    @Inject(AlternativeProductRepositoryToken) private alternativeProductRepository: AlternativeProductRepository
  ) {}

  async execute({ productId, alternativeProductId }: { productId: string; alternativeProductId: string }) {
    return this.alternativeProductRepository.create(new AlternativeProduct({ productId, alternativeProductId }));
  }
}
