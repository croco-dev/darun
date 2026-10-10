import { Inject, Service } from 'typedi';
import { isVisualPlatform } from '../entities/VisualClassification';
import { isVisualFlowType } from '../entities/VisualFlowType';
import { productInvalidArgs } from '../errors/productError';
import type { ProductFlowRepository, VisualFlowFilter, VisualFlowSummary } from '../repositories/ProductFlowRepository';
import type { VisualSort } from '../repositories/ProductScreenshotRepository';
import { ProductFlowRepositoryToken } from '../repositories/ProductFlowRepository';
import { normalizeVisualQuery } from './ProductScreenshotMetadata';

export const VISUAL_FLOWS_MAX_FIRST = 48;

type GetVisualFlowsArgs = {
  query?: string | null;
  platform?: string | null;
  flowType?: string | null;
  productSlug?: string | null;
  sort?: VisualSort | null;
  first: number;
  afterId?: string;
  page?: number;
};

@Service()
export class GetVisualFlows {
  constructor(
    @Inject(ProductFlowRepositoryToken)
    private readonly productFlowRepository: ProductFlowRepository
  ) {}

  async execute({ query, platform, flowType, productSlug, sort, first, afterId, page }: GetVisualFlowsArgs): Promise<{
    flows: VisualFlowSummary[];
    totalCount: number;
    hasNextPage: boolean;
  }> {
    if (!Number.isInteger(first) || first < 1 || first > VISUAL_FLOWS_MAX_FIRST) {
      throw new Error('pagination/invalid-connection-args');
    }

    const resolvedSort: VisualSort = sort ?? 'LATEST';
    if (resolvedSort !== 'LATEST' && resolvedSort !== 'POPULAR') {
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

    const [flows, totalCount] =
      resolvedSort === 'POPULAR'
        ? await (async () => {
            // POPULAR는 오프셋(page) 방식. 1-based, 미지정 시 1페이지.
            const resolvedPage = page ?? 1;
            if (!Number.isInteger(resolvedPage) || resolvedPage < 1) {
              throw new Error('pagination/invalid-connection-args');
            }
            const rows = await this.productFlowRepository.findManyVisualPublishedByFilterAndPageAndLimit(
              filter,
              resolvedPage,
              first + 1
            );
            const count = await this.productFlowRepository.countVisualPublishedByFilter(filter);
            return [rows, count] as const;
          })()
        : await (async () => {
            const [rows, count] = await Promise.all([
              this.productFlowRepository.findManyVisualPublishedByFilterAndAfterIdAndLimit(
                filter,
                first + 1,
                afterId
              ),
              this.productFlowRepository.countVisualPublishedByFilter(filter),
            ]);
            return [rows, count] as const;
          })();

    const hasNextPage = flows.length > first;

    return {
      flows: hasNextPage ? flows.slice(0, first) : flows,
      totalCount,
      hasNextPage,
    };
  }
}
