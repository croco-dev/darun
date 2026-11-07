import { Inject, Service } from 'typedi';
import { Product } from '../entities/Product';
import { productCreateFailed, productInvalidArgs, productSlugAlreadyExists } from '../errors/productError';
import { getProductInfoLengthError } from '../info/ProductInfo';
import type { ProductRepository } from '../repositories/ProductRepository';
import { ProductRepositoryToken } from '../repositories/ProductRepository';

@Service()
export class CreateProduct {
  constructor(
    @Inject(ProductRepositoryToken)
    private readonly productRepository: ProductRepository
  ) {}

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
    const lengthError = getProductInfoLengthError('name', name) ?? getProductInfoLengthError('summary', summary);
    if (lengthError) throw productInvalidArgs(lengthError);

    const exists = await this.productRepository.findOneBySlug(slug);
    if (exists) {
      throw productSlugAlreadyExists();
    }

    const newProduct = new Product({
      name,
      slug,
      logoUrl,
      summary,
      description,
    });

    const insertedProduct = await this.productRepository.insert(newProduct);

    if (!insertedProduct) {
      throw productCreateFailed();
    }

    return insertedProduct;
  }
}
