import type { ProductUsageCondition, ProductUsageConditionsSnapshot } from '@darun/products-domain';
import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { eq } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { randomUUID } from 'node:crypto';
import { products } from '../entities/ProductSchema';
import { lockProductSource } from './productSourceMutex';

@Service()
export class PostgresqlProductUsageConditions {
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

  async findBySlug(slug: string) {
    const [row] = await this.db
      .select({ productId: products.id, conditions: products.usageConditions })
      .from(products)
      .where(eq(products.slug, slug));
    return row ?? null;
  }

  save(input: {
    productId: string;
    expectedRevision: string | null;
    editorId: string;
    items: ProductUsageCondition[];
  }) {
    return this.db.transaction(async tx => {
      const product = await lockProductSource(tx, input.productId);
      const current = product.usageConditions;
      if ((current?.revision ?? null) !== input.expectedRevision) return null;
      if (input.items.length === 0 && !current) return { items: [], revision: null, editorId: null };

      const snapshot: ProductUsageConditionsSnapshot = {
        version: 1,
        revision: randomUUID(),
        editorId: input.editorId,
        items: input.items,
      };
      try {
        await tx.update(products).set({ usageConditions: snapshot }).where(eq(products.id, product.id));
      } catch {
        throw new Error('Could not save product usage conditions');
      }
      return snapshot;
    });
  }
}
