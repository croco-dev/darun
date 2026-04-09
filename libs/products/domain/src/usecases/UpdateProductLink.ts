import { Inject, Service } from 'typedi';
import type { ProductLink } from '../entities/ProductLink';
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
    title,
    link,
    displayLink,
    iconUrl,
  }: {
    linkId: string;
    title?: string;
    link?: string;
    displayLink?: string;
    iconUrl?: string;
  }): Promise<ProductLink> {
    return this.productLinkRepository.updateById(linkId, productLink => {
      productLink.update({ title, link, displayLink, iconUrl });
      return productLink;
    });
  }
}
