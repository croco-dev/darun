import { Inject, Service } from 'typedi';
import { ProductScreenshot } from '../entities/ProductScreenshot';
import { productInvalidArgs } from '../errors/productError';
import type { ProductScreenshotRepository } from '../repositories/ProductScreenshotRepository';
import { ProductScreenshotRepositoryToken } from '../repositories/ProductScreenshotRepository';
import {
  normalizeScreenshotImageAlt,
  normalizeScreenshotTitle,
  normalizeVisualPlatform,
  normalizeVisualScreenType,
} from './ProductScreenshotMetadata';

@Service()
export class AddProductScreenshot {
  constructor(
    @Inject(ProductScreenshotRepositoryToken)
    private readonly productScreenshotRepository: ProductScreenshotRepository
  ) {}

  async execute({
    productId,
    imageAlt,
    imageUrl,
    title,
    platform,
    screenType,
    requestId,
  }: {
    productId: string;
    imageUrl: string;
    imageAlt: string;
    title?: string | null;
    platform?: string | null;
    screenType?: string | null;
    requestId?: unknown;
  }) {
    if (
      requestId !== undefined &&
      (typeof requestId !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId))
    ) {
      throw productInvalidArgs('스크린샷 등록 요청 ID는 UUID 형식이어야 합니다.');
    }
    const normalizedTitle = normalizeScreenshotTitle(title);
    const normalizedImageAlt = normalizeScreenshotImageAlt(imageAlt);
    const normalizedPlatform = normalizeVisualPlatform(platform);
    const normalizedScreenType = normalizeVisualScreenType(screenType);

    return this.productScreenshotRepository.insert(
      new ProductScreenshot({
        imageUrl,
        imageAlt: normalizedImageAlt,
        productId,
        title: normalizedTitle,
        platform: normalizedPlatform,
        screenType: normalizedScreenType,
      }),
      requestId
    );
  }
}
