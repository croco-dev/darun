import { Inject, Service } from 'typedi';
import { ProductTag } from '../entities/ProductTag';
import { Tag } from '../entities/Tag';
import { ProductTagRepository, ProductTagRepositoryToken } from '../repositories/ProductTagRepository';

@Service()
export class UpdateProductTag {
  constructor(@Inject(ProductTagRepositoryToken) private readonly productTagRepository: ProductTagRepository) {}

  async execute({ productId, tagNames }: { productId: string; tagNames: string[] }) {
    const tags = tagNames.map(name => new Tag({ name }));
    await this.productTagRepository.upsert(new ProductTag({ productId, tags }));
  }
}
