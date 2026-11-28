import { Inject, Service } from 'typedi';
import { Product } from '../entities/Product';
import { productDescriptionEditConflict } from '../errors/productDescriptionError';
import { productInvalidArgs } from '../errors/productError';
import {
  splitProductUsageConditions,
  USAGE_CONDITIONS_HTML_END,
  USAGE_CONDITIONS_HTML_START,
} from '../info/ProductDescriptionConditions';
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
    description?: string | null;
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

      let nextDescription = description;
      if (description !== undefined) {
        const { block } = splitProductUsageConditions(product.description ?? '');
        const body = block && description?.endsWith(block) ? description.slice(0, -block.length) : description;
        if (body?.includes(USAGE_CONDITIONS_HTML_START.trim()) || body?.includes(USAGE_CONDITIONS_HTML_END.trim())) {
          throw productInvalidArgs('사용 조건은 전용 편집 화면에서 수정해 주세요.');
        }
        nextDescription = block ? (body ?? '') + block : body;
      }

      product.update({
        name,
        summary,
        description: nextDescription,
        logoUrl,
      });

      return product;
    });
  }
}
