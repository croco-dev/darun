import { Inject, Service } from 'typedi';
import { productFlowNotFound } from '../errors/productFlowError';
import type { ProductFlowRepository } from '../repositories/ProductFlowRepository';
import { ProductFlowRepositoryToken } from '../repositories/ProductFlowRepository';

@Service()
export class DeleteProductFlow {
  constructor(
    @Inject(ProductFlowRepositoryToken)
    private readonly productFlowRepository: ProductFlowRepository
  ) {}

  async execute(id: string): Promise<void> {
    const flow = await this.productFlowRepository.findById(id);
    if (!flow) {
      throw productFlowNotFound();
    }
    await this.productFlowRepository.deleteById(id);
  }
}
