import { Inject, Service } from 'typedi';
import { isVisualPlatform, isVisualScreenType } from '../entities/VisualClassification';
import type { VisualPlatform, VisualScreenType } from '../entities/VisualClassification';
import { productInvalidArgs } from '../errors/productError';
import type {
  VisualScreenshotFilter,
  VisualScreenshotWithProduct,
  ProductScreenshotRepository,
} from '../repositories/ProductScreenshotRepository';
import { ProductScreenshotRepositoryToken } from '../repositories/ProductScreenshotRepository';
import { normalizeVisualQuery } from './ProductScreenshotMetadata';

export const VISUAL_SCREENSHOTS_MAX_FIRST = 48;

type GetVisualScreenshotsArgs = {
  query?: string | null;
  platform?: string | null;
  screenType?: string | null;
  productSlug?: string | null;
  first: number;
  afterId?: string;
};

function resolvePlatformFilter(platform: string | null | undefined): VisualPlatform | undefined {
  if (platform === null || platform === undefined || platform === '') {
    return undefined;
  }
  if (!isVisualPlatform(platform)) {
    throw productInvalidArgs('지원하지 않는 플랫폼 값입니다.');
  }
  return platform;
}

function resolveScreenTypeFilter(screenType: string | null | undefined): VisualScreenType | undefined {
  if (screenType === null || screenType === undefined || screenType === '') {
    return undefined;
  }
  if (!isVisualScreenType(screenType)) {
    throw productInvalidArgs('지원하지 않는 화면 유형 값입니다.');
  }
  return screenType;
}

@Service()
export class GetVisualScreenshots {
  constructor(
    @Inject(ProductScreenshotRepositoryToken)
    private readonly productScreenshotRepository: ProductScreenshotRepository
  ) {}

  async execute({ query, platform, screenType, productSlug, first, afterId }: GetVisualScreenshotsArgs): Promise<{
    screenshots: VisualScreenshotWithProduct[];
    totalCount: number;
    hasNextPage: boolean;
  }> {
    if (!Number.isInteger(first) || first < 1 || first > VISUAL_SCREENSHOTS_MAX_FIRST) {
      throw new Error('pagination/invalid-connection-args');
    }

    const normalizedQuery = normalizeVisualQuery(query);
    const trimmedProductSlug =
      typeof productSlug === 'string' && productSlug.trim().length > 0 ? productSlug.trim() : undefined;
    const platformFilter = resolvePlatformFilter(platform);
    const screenTypeFilter = resolveScreenTypeFilter(screenType);

    const filter: VisualScreenshotFilter = {
      query: normalizedQuery,
      ...(platformFilter ? { platform: platformFilter } : {}),
      ...(screenTypeFilter ? { screenType: screenTypeFilter } : {}),
      ...(trimmedProductSlug ? { productSlug: trimmedProductSlug } : {}),
    };

    const [screenshots, totalCount] = await Promise.all([
      this.productScreenshotRepository.findManyVisualPublishedByFilterAndAfterIdAndLimit(filter, first + 1, afterId),
      this.productScreenshotRepository.countVisualPublishedByFilter(filter),
    ]);

    const hasNextPage = screenshots.length > first;

    return {
      screenshots: hasNextPage ? screenshots.slice(0, first) : screenshots,
      totalCount,
      hasNextPage,
    };
  }
}
