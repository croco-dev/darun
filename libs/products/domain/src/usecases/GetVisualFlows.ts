import { Inject, Service } from 'typedi';
import { isVisualPlatform } from '../entities/VisualClassification';
import { isVisualFlowType } from '../entities/VisualFlowType';
import { productInvalidArgs } from '../errors/productError';
import type { ProductFlowRepository, VisualFlowFilter, VisualFlowSummary } from '../repositories/ProductFlowRepository';
import { ProductFlowRepositoryToken } from '../repositories/ProductFlowRepository';
import { normalizeVisualQuery } from './ProductScreenshotMetadata';

export const VISUAL_FLOWS_MAX_FIRST = 48;

type GetVisualFlowsArgs = {
  query?: string | null;
  platform?: string | null;
  flowType?: string | null;
  productSlug?: string | null;
  first: number;
  afterId?: string;
};

@Service()
export class GetVisualFlows {
  constructor(
    @Inject(ProductFlowRepositoryToken)
    private readonly productFlowRepository: ProductFlowRepository
  ) {}

  async execute({ query, platform, flowType, productSlug, first, afterId }: GetVisualFlowsArgs): Promise<{
    flows: VisualFlowSummary[];
    totalCount: number;
    hasNextPage: boolean;
  }> {
    if (!Number.isInteger(first) || first < 1 || first > VISUAL_FLOWS_MAX_FIRST) {
      throw new Error('pagination/invalid-connection-args');
    }

    const normalizedQuery = normalizeVisualQuery(query);
    const trimmedProductSlug =
      typeof productSlug === 'string' && productSlug.trim().length > 0 ? productSlug.trim() : undefined;

    if (platform !== null && platform !== undefined && platform !== '' && !isVisualPlatform(platform)) {
      throw productInvalidArgs('지원하지 않는 플랫폼 값입니다.');
    }
    if (flowType !== null && flowType !== undefined && flowType !== '' && !isVisualFlowType(flowType)) {
      throw productInvalidArgs('지원하지 않는 플로 유형 값입니다.');
    }

    const filter: VisualFlowFilter = {
      query: normalizedQuery,
      ...(platform ? { platform } : {}),
      ...(flowType ? { flowType } : {}),
      ...(trimmedProductSlug ? { productSlug: trimmedProductSlug } : {}),
    };

    const [flows, totalCount] = await Promise.all([
      this.productFlowRepository.findManyVisualPublishedByFilterAndAfterIdAndLimit(filter, first + 1, afterId),
      this.productFlowRepository.countVisualPublishedByFilter(filter),
    ]);

    const hasNextPage = flows.length > first;

    return {
      flows: hasNextPage ? flows.slice(0, first) : flows,
      totalCount,
      hasNextPage,
    };
  }
}
