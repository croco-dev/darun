import { Inject, Service } from 'typedi';
import { Product } from '../entities/Product';
import { productCreateFailed, productSlugAlreadyExists } from '../errors/productError';
import { ProductRepository, ProductRepositoryToken } from '../repositories/ProductRepository';

@Service()
export class CreateProduct {
  constructor(@Inject(ProductRepositoryToken) private readonly productRepository: ProductRepository) {}

  async execute({
    name,
    slug,
    logoUrl,
    summary,
    description,
  }: {
    name: string;
    slug: string;
    logoUrl: string;
    summary: string;
    description?: string;
  }): Promise<Product> {
    const exists = await this.productRepository.findOneBySlug(slug);
    if (exists) {
      throw productSlugAlreadyExists();
    }

    const newProduct = new Product({ name, slug, logoUrl, summary, description });

    const insertedProduct = await this.productRepository.insert(newProduct);

    if (!insertedProduct) {
      throw productCreateFailed();
    }

    return insertedProduct;
  }
}
