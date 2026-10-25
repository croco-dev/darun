import { Inject, Service } from 'typedi';
import { ProductLink } from '../entities/ProductLink';
import type { ProductLinkRepository } from '../repositories/ProductLinkRepository';
import { ProductLinkRepositoryToken } from '../repositories/ProductLinkRepository';

@Service()
export class UpdateProductLink {
  constructor(
    @Inject(ProductLinkRepositoryToken)
    private readonly productLinkRepository: ProductLinkRepository
  ) {}

  async execute({
    linkId,
    productId,
    title,
    link,
    displayLink,
    iconUrl,
  }: {
    linkId: string;
    productId: string;
    title?: string;
    link?: string;
    displayLink?: string;
    iconUrl?: string;
  }): Promise<ProductLink> {
    return this.productLinkRepository.updateById(linkId, productId, productLink => {
      productLink.update({ title, link, displayLink, iconUrl });
      return productLink;
    });
  }
}
