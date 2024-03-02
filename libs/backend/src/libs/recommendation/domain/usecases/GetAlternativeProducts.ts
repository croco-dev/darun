import { Inject, Service } from 'typedi';
import {
  AlternativeProductRepository,
  AlternativeProductRepositoryToken,
} from '../repositories/AlternativeProductRepository';

@Service()
export class GetAlternativeProducts {
  constructor(
    @Inject(AlternativeProductRepositoryToken) private alternativeProductRepository: AlternativeProductRepository
  ) {}

  async execute({ productId }: { productId: string }) {
    return this.alternativeProductRepository.findManyByProductId(productId);
  }
}
