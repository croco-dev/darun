import { Inject, Service } from 'typedi';
import { ProductTag } from '../entities/ProductTag';
import { ProductTagRepository, ProductTagRepositoryToken } from '../repositories/ProductTagRepository';

@Service()
export class UpdateProductTag {
  constructor(@Inject(ProductTagRepositoryToken) private readonly productTagRepository: ProductTagRepository) {}

  async execute({ productId, tagNames }: { productId: string; tagNames: string[] }) {
    await this.productTagRepository.updateTagsToProduct(
      productId,
      tagNames.map(name => new ProductTag({ name, productId }))
    );
  }
}
