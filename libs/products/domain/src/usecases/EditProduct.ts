import { Inject, Service } from 'typedi';
import { Product } from '../entities/Product';
import { productInvalidArgs } from '../errors/productError';
import { getProductInfoLengthError } from '../info/ProductInfo';
import type { ProductRepository } from '../repositories/ProductRepository';
import { ProductRepositoryToken } from '../repositories/ProductRepository';

@Service()
export class EditProduct {
  constructor(
    @Inject(ProductRepositoryToken)
    private readonly productRepository: ProductRepository
  ) {}

  async execute({
    id,
    name,
    summary,
    description,
    logoUrl,
  }: {
    id: string;
    name?: string;
    summary?: string;
    description?: string;
    logoUrl?: string;
  }): Promise<Product> {
    const lengthError = getProductInfoLengthError('name', name) ?? getProductInfoLengthError('summary', summary);
    if (lengthError) throw productInvalidArgs(lengthError);

    return this.productRepository.updateById(id, product => {
      product.update({
        name,
        summary,
        description,
        logoUrl,
      });

      return product;
    });
  }
}
