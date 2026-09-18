import { Inject, Service } from 'typedi';
import type { ProductFlowRepository, VisualFlowDetail } from '../repositories/ProductFlowRepository';
import { ProductFlowRepositoryToken } from '../repositories/ProductFlowRepository';

@Service()
export class GetVisualFlowById {
  constructor(
    @Inject(ProductFlowRepositoryToken)
    private readonly productFlowRepository: ProductFlowRepository
  ) {}

  async execute({ id }: { id: string }): Promise<VisualFlowDetail | null> {
    return this.productFlowRepository.findVisualPublishedById(id);
  }
}
