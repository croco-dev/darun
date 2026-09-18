import { Inject, Service } from 'typedi';
import { ProductScreenshot } from '../entities/ProductScreenshot';
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
  }: {
    productId: string;
    imageUrl: string;
    imageAlt: string;
    title?: string | null;
    platform?: string | null;
    screenType?: string | null;
  }) {
    const normalizedTitle = normalizeScreenshotTitle(title);
    const normalizedImageAlt = normalizeScreenshotImageAlt(imageAlt);
    const normalizedPlatform = normalizeVisualPlatform(platform);
    const normalizedScreenType = normalizeVisualScreenType(screenType);

    await this.productScreenshotRepository.insert(
      new ProductScreenshot({
        imageUrl,
        imageAlt: normalizedImageAlt,
        productId,
        title: normalizedTitle,
        platform: normalizedPlatform,
        screenType: normalizedScreenType,
      })
    );
  }
}
