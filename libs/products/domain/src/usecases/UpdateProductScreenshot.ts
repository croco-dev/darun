import { Inject, Service } from 'typedi';
import { ProductScreenshot } from '../entities/ProductScreenshot';
import { productScreenshotInUse } from '../errors/productFlowError';
import type { ProductFlowRepository } from '../repositories/ProductFlowRepository';
import { ProductFlowRepositoryToken } from '../repositories/ProductFlowRepository';
import type { ProductScreenshotRepository } from '../repositories/ProductScreenshotRepository';
import { ProductScreenshotRepositoryToken } from '../repositories/ProductScreenshotRepository';
import {
  normalizeScreenshotImageAlt,
  normalizeScreenshotTitle,
  normalizeVisualPlatform,
  normalizeVisualScreenType,
} from './ProductScreenshotMetadata';

@Service()
export class UpdateProductScreenshot {
  constructor(
    @Inject(ProductScreenshotRepositoryToken)
    private readonly productScreenshotRepository: ProductScreenshotRepository,
    @Inject(ProductFlowRepositoryToken)
    private readonly productFlowRepository: ProductFlowRepository
  ) {}

  async execute({
    id,
    title,
    imageAlt,
    platform,
    screenType,
  }: {
    id: string;
    imageAlt: string;
    title?: string | null;
    platform?: string | null;
    screenType?: string | null;
  }): Promise<ProductScreenshot> {
    const normalizedTitle = normalizeScreenshotTitle(title);
    const normalizedImageAlt = normalizeScreenshotImageAlt(imageAlt);
    const normalizedPlatform = normalizeVisualPlatform(platform);
    const normalizedScreenType = normalizeVisualScreenType(screenType);

    return this.productScreenshotRepository.updateById(
      id,
      current =>
        new ProductScreenshot({
          id: current.id,
          imageUrl: current.imageUrl,
          productId: current.productId,
          imageAlt: normalizedImageAlt,
          title: normalizedTitle,
          platform: normalizedPlatform,
          screenType: normalizedScreenType,
        }),
      // 잠금 규약(접근 2): 참조 중인 화면의 플랫폼 변경은 screenshot row를
      // FOR UPDATE로 잠근 뒤 검증한다. 같은 플랫폼 유지 시 제목/alt/유형 수정은 허용한다.
      async lockedCurrent => {
        if (lockedCurrent.platform !== normalizedPlatform) {
          const lockedFlowIds = await this.productFlowRepository.findFlowIdsByScreenshotId(id);
          if (lockedFlowIds.length > 0) {
            throw productScreenshotInUse();
          }
        }
      }
    );
  }
}
