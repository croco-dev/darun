import { eq, sql } from 'drizzle-orm';
import { Container, Token } from 'typedi';
import { products } from '../entities/ProductSchema';
import {
  readProductDescriptionEvidenceSources,
  type ProductDescriptionSourceRows,
} from './PostgresqlProductDescriptionEvidenceAssembler';
import type { ProductSourceTransaction } from './productSourceMutex';

export type ProductContentSource = ProductDescriptionSourceRows;
export interface ProductContentSyncRegistrar {
  register(
    tx: ProductSourceTransaction,
    input: {
      before: ProductContentSource;
      after: ProductContentSource;
      sourceRevision: bigint;
    }
  ): Promise<void>;
}
// App composition owns cross-domain search/translation registration. No post-commit hook.
export const ProductContentSyncRegistrarToken = new Token<ProductContentSyncRegistrar>('ProductContentSyncRegistrar');

function canonical(source: ProductContentSource): string {
  const sorted = <T extends { id: string }>(rows: T[]) => [...rows].sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify({
    product: {
      name: source.product.name,
      slug: source.product.slug,
      summary: source.product.summary,
      description: source.product.description,
      categoryIds: [...source.product.categoryIds].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
      publishedAt: source.product.publishedAt,
    },
    features: sorted(source.features).map(({ id, name, summary }) => ({
      id,
      name,
      summary,
    })),
    categories: source.categories.map(category =>
      category
        ? {
            id: category.id,
            slug: category.slug,
            labelKo: category.labelKo,
            labelEn: category.labelEn,
          }
        : null
    ),
    tags: [...source.tags].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
    links: sorted(source.links).map(({ id, title, link, displayLink }) => ({
      id,
      title,
      link,
      displayLink,
    })),
    screenshots: sorted(source.screenshots).map(({ id, title, imageAlt, imageUrl, platform, screenType }) => ({
      id,
      title,
      imageAlt,
      imageUrl,
      platform,
      screenType,
    })),
    flows: sorted(source.flows).map(({ id, title, description, platform, steps }) => ({
      id,
      title,
      description,
      platform,
      steps,
    })),
    researchSources: source.researchSources,
  });
}

/** Capture under the Product-first mutex; finish must run before the owning transaction returns. */
export async function beginProductContentWrite(tx: ProductSourceTransaction, productId: string) {
  const before = await readProductDescriptionEvidenceSources(tx, productId);
  return async () => {
    const after = await readProductDescriptionEvidenceSources(tx, productId);
    if (canonical(before) === canonical(after)) return;
    const [row] = await tx
      .update(products)
      .set({
        contentRevision: sql`${products.contentRevision} + 1`,
        // Product writers already set their response timestamp; child writers need the same checkpoint.
        updatedAt:
          after.product.updatedAt?.getTime() === before.product.updatedAt?.getTime()
            ? new Date()
            : after.product.updatedAt,
      })
      .where(eq(products.id, productId))
      .returning({ contentRevision: products.contentRevision });
    if (!row) throw new Error('Product content revision write failed');
    if (after.product.publishedAt)
      await Container.get(ProductContentSyncRegistrarToken).register(tx, {
        before,
        after,
        sourceRevision: row.contentRevision,
      });
  };
}
