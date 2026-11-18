import type { ProductRepository } from '@darun/products-domain';
import { ProductRepositoryToken } from '@darun/products-domain';
import { Inject, Service } from 'typedi';
import type {
  AlternativeProductExclusion,
  AlternativeProductRepository,
} from '../repositories/AlternativeProductRepository';
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

  async executeManual({ productId }: { productId: string }) {
    return this.alternativeProductRepository.findManyByProductId(productId);
  }

  async execute({ productId }: { productId: string }) {
    const { manual, automatic } = await this.recommendations(productId);
    return [...manual, ...automatic];
  }

  async executeForManagement(productId: string) {
    const exclusions = await this.alternativeProductRepository.findExclusionsByProductId(productId);
    const { automatic } = await this.recommendations(productId, exclusions);
    return { exclusions, automatic };
  }

  private async recommendations(productId: string, exclusions?: AlternativeProductExclusion[]) {
    const manualRows = (await this.executeManual({ productId })).filter(row => row.alternativeProductId !== productId);
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
      return { manual: manualAlternatives, automatic: [] };
    }

    const excluded = exclusions ?? (await this.alternativeProductRepository.findExclusionsByProductId(productId));
    const automaticAlternatives = await this.autoRecommender.recommend({
      productId,
      excludeProductIds: [...manualAlternatives, ...excluded].map(alternative => alternative.alternativeProductId),
      limit: DEFAULT_ALTERNATIVE_LIMIT - manualAlternatives.length,
    });

    return { manual: manualAlternatives, automatic: automaticAlternatives };
  }
}
