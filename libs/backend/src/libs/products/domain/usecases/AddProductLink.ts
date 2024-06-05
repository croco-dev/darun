import { ProductLink, ProductLinkRepository, ProductLinkRepositoryToken } from '@products/domain';
import { Inject, Service } from 'typedi';

@Service()
export class AddProductLink {
  constructor(@Inject(ProductLinkRepositoryToken) private readonly productLinkRepository: ProductLinkRepository) {}

  async execute({
    iconUrl,
    link,
    displayLink,
    title,
  }: {
    title: string;
    link: string;
    displayLink: string;
    iconUrl: string;
  }) {
    await this.productLinkRepository.insert(new ProductLink({ iconUrl, link, displayLink, title }));
  }
}
