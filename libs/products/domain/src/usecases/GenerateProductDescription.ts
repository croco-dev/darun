import { Inject, Service } from 'typedi';
import { Product } from '../entities/Product';
import { productNotFound } from '../errors/productError';
import type { CategoryRepository } from '../repositories/CategoryRepository';
import { CategoryRepositoryToken } from '../repositories/CategoryRepository';
import type { ProductFeatureRepository } from '../repositories/ProductFeatureRepository';
import { ProductFeatureRepositoryToken } from '../repositories/ProductFeatureRepository';
import type { ProductLinkRepository } from '../repositories/ProductLinkRepository';
import { ProductLinkRepositoryToken } from '../repositories/ProductLinkRepository';
import type { ProductRepository } from '../repositories/ProductRepository';
import { ProductRepositoryToken } from '../repositories/ProductRepository';
import type {
  ProductDescriptionGenerationContext,
  ProductDescriptionGenerator,
} from '../services/ProductDescriptionGenerator';
import { ProductDescriptionGeneratorToken } from '../services/ProductDescriptionGenerator';

@Service()
export class GenerateProductDescription {
  constructor(
    @Inject(ProductRepositoryToken)
    private readonly productRepository: ProductRepository,
    @Inject(ProductDescriptionGeneratorToken)
    private readonly productDescriptionGenerator: ProductDescriptionGenerator,
    @Inject(ProductFeatureRepositoryToken)
    private readonly productFeatureRepository?: ProductFeatureRepository,
    @Inject(ProductLinkRepositoryToken)
    private readonly productLinkRepository?: ProductLinkRepository,
    @Inject(CategoryRepositoryToken)
    private readonly categoryRepository?: CategoryRepository
  ) {}

  async execute({ productId }: { productId: string }): Promise<Product> {
    const product = await this.productRepository.findOneById(productId);
    if (!product) {
      throw productNotFound();
    }

    let features: Array<{ name: string; summary?: string }> = [];
    if (this.productFeatureRepository) {
      try {
        const foundFeatures = await this.productFeatureRepository.findManyByProductId(product.id);
        features = foundFeatures.map(f => ({
          name: f.name,
          summary: f.summary || undefined,
        }));
      } catch (err) {
        console.warn(`[GenerateProductDescription] Failed to fetch features for ${product.id}:`, err);
      }
    }

    let links: Array<{ title: string; link: string }> = [];
    if (this.productLinkRepository) {
      try {
        const foundLinks = await this.productLinkRepository.findManyByProductId(product.id);
        links = foundLinks.map(l => ({
          title: l.title,
          link: l.link,
        }));
      } catch (err) {
        console.warn(`[GenerateProductDescription] Failed to fetch links for ${product.id}:`, err);
      }
    }

    let categoryLabels: string[] | undefined;
    if (this.categoryRepository && product.categoryIds.length > 0) {
      try {
        const categories = await Promise.all(
          product.categoryIds.map(catId => this.categoryRepository!.findOneById(catId))
        );
        const resolvedNames = categories
          .filter((c): c is NonNullable<typeof c> => Boolean(c))
          .map(c => c.labelKo || c.labelEn)
          .filter(Boolean);
        if (resolvedNames.length > 0) {
          categoryLabels = resolvedNames;
        }
      } catch (err) {
        console.warn(`[GenerateProductDescription] Failed to fetch categories for ${product.id}:`, err);
      }
    }

    const context: ProductDescriptionGenerationContext = {
      features: features.length > 0 ? features : undefined,
      links: links.length > 0 ? links : undefined,
      categoryLabels,
    };

    const generatedDescription = await this.productDescriptionGenerator.generate(product, context);

    return this.productRepository.updateById(product.id, prevProduct => {
      prevProduct.update({ description: generatedDescription });
      return prevProduct;
    });
  }
}
