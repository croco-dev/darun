import { isProductLinkUrl, ProductLinkRole } from '@darun/products-domain/link';
import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { eq, inArray } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { categories } from '../entities/CategorySchema';
import { productLinks } from '../entities/ProductLinksSchema';
import { products } from '../entities/ProductSchema';
import { productScreenshots } from '../entities/ProductScreenshotsSchema';
import { productPublishReviewToken } from './productPublishReviewToken';

@Service()
export class PostgresqlProductPublishReview {
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

  read(slug: string) {
    return this.db.transaction(
      async tx => {
        const [product] = await tx
          .select({
            id: products.id,
            name: products.name,
            summary: products.summary,
            description: products.description,
            categoryIds: products.categoryIds,
            logoUrl: products.logoUrl,
            contentRevision: products.contentRevision,
            publishedAt: products.publishedAt,
          })
          .from(products)
          .where(eq(products.slug, slug));
        if (!product) return null;

        const category = product.categoryIds.length
          ? await tx
              .select({ id: categories.id })
              .from(categories)
              .where(inArray(categories.id, product.categoryIds))
              .limit(1)
          : [];
        const links = await tx
          .select({ role: productLinks.role, url: productLinks.link })
          .from(productLinks)
          .where(eq(productLinks.productId, product.id));
        const screenshot = await tx
          .select({ id: productScreenshots.id })
          .from(productScreenshots)
          .where(eq(productScreenshots.productId, product.id))
          .limit(1);
        const officialLinks = links.filter(link => link.role === ProductLinkRole.official);
        const officialLinkStatus = officialLinks.length
          ? officialLinks.every(link => isProductLinkUrl(link.url))
            ? 'READY'
            : 'INVALID'
          : links.some(link => link.role === null)
            ? 'UNCLASSIFIED'
            : 'MISSING';
        return {
          productId: product.id,
          publishedAt: product.publishedAt,
          reviewToken: productPublishReviewToken(product),
          source: {
            name: product.name,
            summary: product.summary,
            description: product.description ?? '',
          },
          hasCategory: category.length > 0,
          hasLogo: Boolean(product.logoUrl.trim()),
          hasScreenshot: screenshot.length > 0,
          officialLinkStatus,
        } as const;
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' }
    );
  }
}
