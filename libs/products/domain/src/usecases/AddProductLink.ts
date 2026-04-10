import { Inject, Service } from "typedi";
import { ProductLink } from "../entities/ProductLink";
import type { ProductLinkRepository } from "../repositories/ProductLinkRepository";
import { ProductLinkRepositoryToken } from "../repositories/ProductLinkRepository";

@Service()
export class AddProductLink {
  constructor(
    @Inject(ProductLinkRepositoryToken)
    private readonly productLinkRepository: ProductLinkRepository,
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
    await this.productLinkRepository.insert(
      new ProductLink({ iconUrl, link, displayLink, title, productId }),
    );
  }
}
