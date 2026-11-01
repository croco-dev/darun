import { Inject, Service } from 'typedi';
import { ProductLink } from '../entities/ProductLink';
import { productInvalidArgs } from '../errors/productError';
import { isProductLinkUrl } from '../link/ProductLinkUrl';
import type { ProductLinkRepository } from '../repositories/ProductLinkRepository';
import { ProductLinkRepositoryToken } from '../repositories/ProductLinkRepository';

@Service()
export class AddProductLink {
  constructor(
    @Inject(ProductLinkRepositoryToken)
    private readonly productLinkRepository: ProductLinkRepository
  ) {}

  async execute({
    iconUrl,
    link,
    displayLink,
    title,
    productId,
  }: {
    title: string;
    link: string;
    displayLink: string;
    iconUrl: string;
    productId: string;
  }) {
    if (!isProductLinkUrl(link)) throw productInvalidArgs('완전한 HTTP(S) URL을 입력해주세요.');
    await this.productLinkRepository.insert(new ProductLink({ iconUrl, link, displayLink, title, productId }));
  }
}
