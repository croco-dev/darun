import type { ProductRepository } from '@darun/products-domain';
import { ProductRepositoryToken } from '@darun/products-domain';
import { Inject, Service } from 'typedi';
import type { AlternativeProductRepository } from '../repositories/AlternativeProductRepository';
import { AlternativeProductRepositoryToken } from '../repositories/AlternativeProductRepository';
import { AutoRecommender } from '../services/AutoRecommender';

const DEFAULT_ALTERNATIVE_LIMIT = 5;

@Service()
export class GetAlternativeProducts {
  constructor(
    @Inject(AlternativeProductRepositoryToken)
    private readonly alternativeProductRepository: AlternativeProductRepository,
    @Inject(ProductRepositoryToken)
    private readonly productRepository: Pick<ProductRepository, 'findPublishedByIds'>,
    private readonly autoRecommender?: AutoRecommender
  ) {}

  async execute({ productId }: { productId: string }) {
    const manualRows = (await this.alternativeProductRepository.findManyByProductId(productId)).filter(
      alternative => alternative.alternativeProductId !== productId
    );
    const publishedProducts = await this.productRepository.findPublishedByIds(
      manualRows.map(alternative => alternative.alternativeProductId)
    );
    const publishedIds = new Set(publishedProducts.flatMap(product => (product ? [product.id] : [])));
    const seenIds = new Set<string>();
    const manualAlternatives = manualRows
      .filter(alternative => {
        const id = alternative.alternativeProductId;
        if (!publishedIds.has(id) || seenIds.has(id)) return false;
        seenIds.add(id);
        return true;
      })
      .slice(0, DEFAULT_ALTERNATIVE_LIMIT);
    if (manualAlternatives.length >= DEFAULT_ALTERNATIVE_LIMIT || !this.autoRecommender) {
      return manualAlternatives;
    }

    const automaticAlternatives = await this.autoRecommender.recommend({
      productId,
      excludeProductIds: manualAlternatives.map(alternative => alternative.alternativeProductId),
      limit: DEFAULT_ALTERNATIVE_LIMIT - manualAlternatives.length,
    });

    return [...manualAlternatives, ...automaticAlternatives];
  }
}
