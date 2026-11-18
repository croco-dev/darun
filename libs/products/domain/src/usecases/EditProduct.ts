import { Inject, Service } from 'typedi';
import { Product } from '../entities/Product';
import { productDescriptionEditConflict } from '../errors/productDescriptionError';
import { productInvalidArgs } from '../errors/productError';
import { getProductInfoLengthError } from '../info/ProductInfo';
import type { ProductRepository } from '../repositories/ProductRepository';
import { ProductRepositoryToken } from '../repositories/ProductRepository';
import { computeSha256 } from '../services/ProductDescriptionEvidenceProjector';

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
    expectedDescriptionHash,
    logoUrl,
  }: {
    id: string;
    name?: string;
    summary?: string;
    description?: string;
    expectedDescriptionHash?: string | null;
    logoUrl?: string;
  }): Promise<Product> {
    const lengthError = getProductInfoLengthError('name', name) ?? getProductInfoLengthError('summary', summary);
    if (lengthError) throw productInvalidArgs(lengthError);

    return this.productRepository.updateById(id, product => {
      if (description !== undefined && expectedDescriptionHash !== undefined) {
        const currentHash = product.description == null ? null : computeSha256(product.description);
        if (currentHash !== expectedDescriptionHash) throw productDescriptionEditConflict();
      }

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
