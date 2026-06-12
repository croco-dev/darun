import { Inject, Service } from "typedi";
import type { ImageDeleter } from "@darun/images-domain";
import { ImageDeleterToken } from "@darun/images-domain";
import { productScreenshotNotFound } from "../errors/productError";
import type { ProductScreenshotRepository } from "../repositories/ProductScreenshotRepository";
import { ProductScreenshotRepositoryToken } from "../repositories/ProductScreenshotRepository";

@Service()
export class DeleteProductScreenshot {
  constructor(
    @Inject(ProductScreenshotRepositoryToken)
    private readonly productScreenshotRepository: ProductScreenshotRepository,
    @Inject(ImageDeleterToken)
    private readonly imageDeleter: ImageDeleter,
  ) {}

  async execute(id: string): Promise<void> {
    const screenshot = await this.productScreenshotRepository.findById(id);

    if (!screenshot) {
      throw productScreenshotNotFound();
    }

    await this.imageDeleter.delete(screenshot.imageUrl);
    await this.productScreenshotRepository.deleteById(id);
  }
}
