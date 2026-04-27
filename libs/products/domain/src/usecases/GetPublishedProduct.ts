import { Inject, Service } from 'typedi';
import { Product } from '../entities/Product';
import type { ProductRepository } from '../repositories/ProductRepository';
import { ProductRepositoryToken } from '../repositories/ProductRepository';

@Service()
export class GetPublishedProduct {
  constructor(
    @Inject(ProductRepositoryToken)
    private readonly productRepository: ProductRepository
  ) {}

  async execute({ ids }: { ids: string[] }): Promise<(Product | null)[]>;
  async execute({ slug }: { slug: string }): Promise<Product | null>;
  async execute({ id }: { id: string }): Promise<Product | null>;
  async execute({
    id,
    ids,
    slug,
  }: {
    id?: string;
    ids?: string[];
    slug?: string;
  }): Promise<Product | null | (Product | null)[]> {
    if (ids) {
      return this.productRepository.findPublishedByIds(ids);
    }

    if (slug) {
      return this.productRepository.findPublishedOneBySlug(slug);
    }

    if (!id) {
      throw new Error('id or slug is required to get a product.');
    }
    return this.productRepository.findPublishedOneById(id);
  }
}
