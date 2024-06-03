import { Inject, Service } from 'typedi';
import { ProductScreenshot } from '../entities/ProductScreenshot';
import {
  ProductScreenshotRepository,
  ProductScreenshotRepositoryToken,
} from '../repositories/ProductScreenshotRepository';

@Service()
export class AddProductScreenshot {
  constructor(
    @Inject(ProductScreenshotRepositoryToken) private readonly productScreenshotRepository: ProductScreenshotRepository
  ) {}

  async execute({ productId, imageAlt, imageUrl }: { productId: string; imageUrl: string; imageAlt: string }) {
    await this.productScreenshotRepository.insert(new ProductScreenshot({ imageUrl, imageAlt, productId }));
  }
}
