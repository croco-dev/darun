import type { Product, ProductRepository, ProductTagRepository } from '@darun/products-domain';
import { ProductRepositoryToken, ProductTagRepositoryToken } from '@darun/products-domain';
import { Inject, Service } from 'typedi';
import { AlternativeProduct } from '../entities/AlternativeProduct';

const CATEGORY_CANDIDATE_CAP = 30;

type Candidate = {
  readonly productId: string;
  readonly categoryMatches: number;
  readonly tagMatches: number;
  readonly publishedAt: Date;
  readonly order: number;
  readonly source: 'category' | 'tag';
};

type ProductReader = Pick<
  ProductRepository,
  'findPublishedOneById' | 'findPublishedByCategoryIdAndLimit' | 'findTopNSortByPublishedAtDesc'
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
    const startTime = Date.now();
    const candidates = await this.collectCandidates(product, excludedIds, startTime);

    return candidates.slice(0, limit).map(
      candidate =>
        new AlternativeProduct({
          productId,
          alternativeProductId: candidate.productId,
        })
    );
  }

  private async collectCandidates(
    product: Product,
    excludedIds: Set<string>,
    startTime: number
  ): Promise<Candidate[]> {
    const candidates = new Map<string, Candidate>();
    let order = 0;
    let categoryCandidateCount = 0;

    for (const categoryId of product.categoryIds) {
      const products = await this.productRepository.findPublishedByCategoryIdAndLimit(categoryId, CATEGORY_CANDIDATE_CAP);

      for (const candidateProduct of products) {
        if (excludedIds.has(candidateProduct.id)) {
          continue;
        }

        categoryCandidateCount++;
        const prev = candidates.get(candidateProduct.id);
        candidates.set(candidateProduct.id, {
          productId: candidateProduct.id,
          categoryMatches: (prev?.categoryMatches ?? 0) + 1,
          tagMatches: prev?.tagMatches ?? 0,
          publishedAt: candidateProduct.publishedAt ?? new Date(0),
          order: prev?.order ?? order++,
          source: 'category',
        });
      }
    }

    const tagCandidateCount = await this.addTagCandidates({ product, candidates, excludedIds, order });

    this.logObservability({ categoryCandidateCount, tagCandidateCount, candidates, startTime });

    return [...candidates.values()].sort((a, b) => {
      const scoreDiff = b.categoryMatches * 10 + b.tagMatches - (a.categoryMatches * 10 + a.tagMatches);
      if (scoreDiff !== 0) return scoreDiff;
      const dateDiff = b.publishedAt.getTime() - a.publishedAt.getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.order - b.order;
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
      return 0;
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
    let tagCandidateCount = 0;

    for (const candidateProduct of products) {
      if (excludedIds.has(candidateProduct.id)) {
        continue;
      }

      const tags = tagsByProductId.get(candidateProduct.id) ?? [];
      const tagMatches = tags.filter(tag => targetTagNames.has(tag.name)).length;
      if (!tagMatches) {
        continue;
      }

      tagCandidateCount++;
      const prev = candidates.get(candidateProduct.id);
      candidates.set(candidateProduct.id, {
        productId: candidateProduct.id,
        categoryMatches: prev?.categoryMatches ?? 0,
        tagMatches: (prev?.tagMatches ?? 0) + tagMatches,
        publishedAt: candidateProduct.publishedAt ?? new Date(0),
        order: prev?.order ?? order++,
        source: 'tag',
      });
    }

    return tagCandidateCount;
  }

  private logObservability({
    categoryCandidateCount,
    tagCandidateCount,
    candidates,
    startTime,
  }: {
    categoryCandidateCount: number;
    tagCandidateCount: number;
    candidates: Map<string, Candidate>;
    startTime: number;
  }): void {
    const dedupedCandidateCount = candidates.size;
    const totalRawCandidates = categoryCandidateCount + tagCandidateCount;
    const finalSourceRatio =
      totalRawCandidates > 0
        ? Number((categoryCandidateCount / totalRawCandidates).toFixed(2))
        : 0;

    console.info({
      event: 'recommendation.candidates_collected',
      categoryCandidateCount,
      tagCandidateCount,
      dedupedCandidateCount,
      finalSourceRatio,
      latencyMs: Date.now() - startTime,
    });
  }
}
