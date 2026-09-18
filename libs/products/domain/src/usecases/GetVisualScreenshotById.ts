import { Inject, Service } from 'typedi';
import type {
  ProductScreenshotRepository,
  VisualScreenshotWithProduct,
} from '../repositories/ProductScreenshotRepository';
import { ProductScreenshotRepositoryToken } from '../repositories/ProductScreenshotRepository';

@Service()
export class GetVisualScreenshotById {
  constructor(
    @Inject(ProductScreenshotRepositoryToken)
    private readonly productScreenshotRepository: ProductScreenshotRepository
  ) {}

  async execute({ id }: { id: string }): Promise<VisualScreenshotWithProduct | null> {
    return this.productScreenshotRepository.findVisualPublishedById(id);
  }
}
