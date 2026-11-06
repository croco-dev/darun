import { Inject, Service } from 'typedi';
import { Product } from '../entities/Product';
import { productInvalidArgs } from '../errors/productError';
import type { ProductRepository } from '../repositories/ProductRepository';
import { ProductRepositoryToken } from '../repositories/ProductRepository';

export const SITEMAP_DEFAULT_LIMIT = 100;
export const SITEMAP_MAX_LIMIT = 200;

@Service()
export class GetPublishedProductsForSitemap {
  constructor(
    @Inject(ProductRepositoryToken)
    private readonly productRepository: ProductRepository
  ) {}

  async execute({
    limit = SITEMAP_DEFAULT_LIMIT,
    cursor,
    lowerBoundId,
    upperBoundId,
  }: {
    limit?: number;
    cursor?: string;
    lowerBoundId?: string;
    upperBoundId?: string;
  } = {}): Promise<{ products: Product[]; nextCursor?: string }> {
    if (!Number.isInteger(limit) || limit < 1 || limit > SITEMAP_MAX_LIMIT) {
      throw productInvalidArgs(`limit must be an integer between 1 and ${SITEMAP_MAX_LIMIT}.`);
    }
    for (const bound of [lowerBoundId, upperBoundId]) {
      if (bound !== undefined && !/^[0-9A-Za-z-]{1,26}$/.test(bound)) {
        throw productInvalidArgs('Sitemap bounds must be valid product IDs.');
      }
    }
    if (lowerBoundId && upperBoundId && lowerBoundId > upperBoundId) {
      throw productInvalidArgs('Sitemap lower bound must not exceed upper bound.');
    }
    // Over-fetch by one so a full final page does not emit a dangling cursor.
    const rows = await this.productRepository.findPublishedByAfterIdAndLimit(limit + 1, cursor, {
      lowerBoundId,
      upperBoundId,
    });
    const hasMore = rows.length > limit;
    const products = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? products[products.length - 1]?.id : undefined;

    return {
      products,
      nextCursor,
    };
  }
}
