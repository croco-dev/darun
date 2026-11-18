import { Inject, Service } from 'typedi';
import type { ProductLinkRepository } from '../repositories/ProductLinkRepository';
import { ProductLinkRepositoryToken } from '../repositories/ProductLinkRepository';

@Service()
export class GetProductLinks {
  constructor(
    @Inject(ProductLinkRepositoryToken)
    private readonly productLinkRepository: ProductLinkRepository
  ) {}

  async execute({ productId }: { productId: string }) {
    const links = await this.productLinkRepository.findManyByProductId(productId);
    const primary = links.find(link => link.isDesignatedPrimary) ?? links[0];
    return links.map(link => ({ ...link, isPrimary: link === primary }));
  }
}
