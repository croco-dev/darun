import { Inject, Service } from 'typedi';
import type { ProductFlowRepository, VisualFlowSummary } from '../repositories/ProductFlowRepository';
import { ProductFlowRepositoryToken } from '../repositories/ProductFlowRepository';

@Service()
export class GetVisualScreenshotFlows {
  constructor(
    @Inject(ProductFlowRepositoryToken)
    private readonly productFlowRepository: ProductFlowRepository
  ) {}

  async execute({ screenshotId }: { screenshotId: string }): Promise<VisualFlowSummary[]> {
    return this.productFlowRepository.findManyVisualPublishedByScreenshotId(screenshotId);
  }
}
