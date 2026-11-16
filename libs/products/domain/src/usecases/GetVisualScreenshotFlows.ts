import { Inject, Service } from 'typedi';
import { productInvalidArgs } from '../errors/productError';
import type { ProductFlowRepository, VisualScreenshotFlow } from '../repositories/ProductFlowRepository';
import { ProductFlowRepositoryToken } from '../repositories/ProductFlowRepository';
import { VISUAL_FLOWS_MAX_FIRST } from './GetVisualFlows';

@Service()
export class GetVisualScreenshotFlows {
  constructor(
    @Inject(ProductFlowRepositoryToken)
    private readonly productFlowRepository: ProductFlowRepository
  ) {}

  async execute({
    screenshotId,
    first,
    afterId,
  }: {
    screenshotId: string;
    first: number;
    afterId?: string;
  }): Promise<{ flows: VisualScreenshotFlow[]; hasNextPage: boolean }> {
    if (!Number.isInteger(first) || first < 1 || first > VISUAL_FLOWS_MAX_FIRST) {
      throw productInvalidArgs('관련 플로는 한 번에 1~48개를 조회할 수 있습니다.');
    }
    const rows = await this.productFlowRepository.findManyVisualPublishedByScreenshotId(
      screenshotId,
      first + 1,
      afterId
    );
    return { flows: rows.slice(0, first), hasNextPage: rows.length > first };
  }
}
