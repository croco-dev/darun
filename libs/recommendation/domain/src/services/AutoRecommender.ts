import type { Product, ProductRepository, ProductTagRepository } from '@darun/products-domain';
import { ProductRepositoryToken, ProductTagRepositoryToken } from '@darun/products-domain';
import { Inject, Service } from 'typedi';
import { AlternativeProduct } from '../entities/AlternativeProduct';

type Candidate = {
  readonly productId: string;
  readonly categoryMatches: number;
  readonly tagMatches: number;
  readonly order: number;
};

type ProductReader = Pick<
  ProductRepository,
  'findPublishedOneById' | 'findPublishedByCategoryId' | 'findTopNSortByPublishedAtDesc'
>;

@Service()
export class AutoRecommender {
  constructor(
    @Inject(ProductRepositoryToken)
    private readonly productRepository: ProductReader,
    @Inject(ProductTagRepositoryToken)
    private readonly productTagRepository: Pick<ProductTagRepository, 'findOneByProductId' | 'findByProductIds'>
  ) {}

  async recommend({
    productId,
    excludeProductIds = [],
    limit = 5,
  }: {
    productId: string;
    excludeProductIds?: string[];
    limit?: number;
  }): Promise<AlternativeProduct[]> {
    if (limit <= 0) {
      return [];
    }

    const product = await this.productRepository.findPublishedOneById(productId);
    if (!product) {
      return [];
    }

    const excludedIds = new Set([productId, ...excludeProductIds]);
    const candidates = await this.collectCandidates(product, excludedIds);

    return candidates.slice(0, limit).map(
      candidate =>
        new AlternativeProduct({
          productId,
          alternativeProductId: candidate.productId,
        })
    );
  }

  private async collectCandidates(product: Product, excludedIds: Set<string>): Promise<Candidate[]> {
    const candidates = new Map<string, Candidate>();
    let order = 0;

    for (const categoryId of product.categoryIds) {
      const products = await this.productRepository.findPublishedByCategoryId(categoryId);

      for (const candidateProduct of products) {
        if (excludedIds.has(candidateProduct.id)) {
          continue;
        }

        const prev = candidates.get(candidateProduct.id);
        candidates.set(candidateProduct.id, {
          productId: candidateProduct.id,
          categoryMatches: (prev?.categoryMatches ?? 0) + 1,
          tagMatches: prev?.tagMatches ?? 0,
          order: prev?.order ?? order++,
        });
      }
    }

    order = await this.addTagCandidates({ product, candidates, excludedIds, order });

    return [...candidates.values()].sort((a, b) => {
      const scoreDiff = b.categoryMatches * 10 + b.tagMatches - (a.categoryMatches * 10 + a.tagMatches);
      return scoreDiff || a.order - b.order;
    });
  }

  private async addTagCandidates({
    product,
    candidates,
    excludedIds,
    order,
  }: {
    product: Product;
    candidates: Map<string, Candidate>;
    excludedIds: Set<string>;
    order: number;
  }): Promise<number> {
    const targetTags = await this.productTagRepository.findOneByProductId(product.id);
    const targetTagNames = new Set(targetTags?.tags.map(tag => tag.name) ?? []);
    if (!targetTagNames.size) {
      return order;
    }

    const products = await this.productRepository.findTopNSortByPublishedAtDesc(50);
    const candidateIds = products
      .filter(candidateProduct => !excludedIds.has(candidateProduct.id))
      .map(candidateProduct => candidateProduct.id);

    const productTags = await this.productTagRepository.findByProductIds(candidateIds);
    console.info({
      event: 'recommendation.batch_tags_loaded',
      batchTagLookupSize: candidateIds.length,
    });

    const tagsByProductId = new Map(productTags.map(pt => [pt.productId, pt.tags]));

    for (const candidateProduct of products) {
      if (excludedIds.has(candidateProduct.id)) {
        continue;
      }

      const tags = tagsByProductId.get(candidateProduct.id) ?? [];
      const tagMatches = tags.filter(tag => targetTagNames.has(tag.name)).length;
      if (!tagMatches) {
        continue;
      }

      const prev = candidates.get(candidateProduct.id);
      candidates.set(candidateProduct.id, {
        productId: candidateProduct.id,
        categoryMatches: prev?.categoryMatches ?? 0,
        tagMatches: (prev?.tagMatches ?? 0) + tagMatches,
        order: prev?.order ?? order++,
      });
    }

    return order;
  }
}
