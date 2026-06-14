import { Inject, Service } from 'typedi';
import { Product } from '../entities/Product';
import type { ProductFeature } from '../entities/ProductFeature';
import type { ProductLink } from '../entities/ProductLink';
import type { ProductScreenshot } from '../entities/ProductScreenshot';
import type { ProductTag } from '../entities/ProductTag';
import type { ProductFeatureRepository } from '../repositories/ProductFeatureRepository';
import { ProductFeatureRepositoryToken } from '../repositories/ProductFeatureRepository';
import type { ProductLinkRepository } from '../repositories/ProductLinkRepository';
import { ProductLinkRepositoryToken } from '../repositories/ProductLinkRepository';
import type { ProductRepository } from '../repositories/ProductRepository';
import { ProductRepositoryToken } from '../repositories/ProductRepository';
import type { ProductScreenshotRepository } from '../repositories/ProductScreenshotRepository';
import { ProductScreenshotRepositoryToken } from '../repositories/ProductScreenshotRepository';
import type { ProductTagRepository } from '../repositories/ProductTagRepository';
import { ProductTagRepositoryToken } from '../repositories/ProductTagRepository';

type ProductLinkWithPrimary = ProductLink & { isPrimary: boolean };

type ProductWithPreload = Product & {
  __preloadedTags?: ProductTag['tags'];
  __preloadedLinks?: ProductLinkWithPrimary[];
  __preloadedScreenshots?: ProductScreenshot[];
  __preloadedFeatures?: ProductFeature[];
};

@Service()
export class GetAllProducts {
  constructor(
    @Inject(ProductRepositoryToken)
    private readonly productRepository: ProductRepository,
    @Inject(ProductLinkRepositoryToken)
    private readonly productLinkRepository?: ProductLinkRepository,
    @Inject(ProductTagRepositoryToken)
    private readonly productTagRepository?: ProductTagRepository,
    @Inject(ProductScreenshotRepositoryToken)
    private readonly productScreenshotRepository?: ProductScreenshotRepository,
    @Inject(ProductFeatureRepositoryToken)
    private readonly productFeatureRepository?: ProductFeatureRepository
  ) {}

  async execute({
    limit,
    cursor,
    type = 'after',
  }: {
    limit: number;
    cursor?: {
      id: string;
    };
    type?: 'after' | 'before';
  }) {
    let products: Product[];
    if (type === 'after') {
      products = await this.productRepository.findAllByAfterIdAndLimit(limit, cursor?.id);
    } else {
      products = await this.productRepository.findAllByBeforeIdAndLimit(limit, cursor?.id);
    }
    const preloadedProducts = await this.preloadProducts(products);
    const total = await this.productRepository.countAll();

    return {
      products: preloadedProducts,
      total,
    };
  }

  private async preloadProducts(products: Product[]): Promise<ProductWithPreload[]> {
    await this.primeProductCache(products);

    if (products.length === 0) {
      return [];
    }

    const productLinkRepository = this.productLinkRepository;
    const productTagRepository = this.productTagRepository;
    const productScreenshotRepository = this.productScreenshotRepository;
    const productFeatureRepository = this.productFeatureRepository;

    if (!productLinkRepository || !productTagRepository || !productScreenshotRepository || !productFeatureRepository) {
      return products;
    }

    const productIds = products.map(product => product.id);

    const productTags = await this.settleAll(productIds, pid => productTagRepository.findOneByProductId(pid));
    const productLinks = await this.settleAll(productIds, pid => productLinkRepository.findManyByProductId(pid));
    const productScreenshots = await this.settleAll(productIds, pid =>
      productScreenshotRepository.findManyByProductIdSortByPriorityDesc(pid)
    );
    const productFeatures = await this.settleAll(productIds, pid => productFeatureRepository.findManyByProductId(pid));

    return products.map((product, index) =>
      Object.assign(product, {
        __preloadedTags: productTags[index]?.tags ?? [],
        __preloadedLinks: (productLinks[index] ?? []).map((link, linkIndex) =>
          Object.assign(link, { isPrimary: linkIndex === 0 })
        ),
        __preloadedScreenshots: productScreenshots[index] ?? [],
        __preloadedFeatures: productFeatures[index] ?? [],
      })
    );
  }

  private async settleAll<T>(ids: string[], fetcher: (id: string) => Promise<T>): Promise<(T | undefined)[]> {
    const results = await Promise.allSettled(ids.map(id => fetcher(id)));
    return results.map(r => (r.status === 'fulfilled' ? r.value : undefined));
  }

  private async primeProductCache(products: Product[]): Promise<void> {
    const productIds = products.map(product => product.id);

    if (productIds.length === 0) {
      return;
    }

    await Promise.all(productIds.map(productId => this.productRepository.findOneById(productId)));
  }
}
