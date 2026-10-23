import { productNotFound } from '@darun/products-domain';
import type { Drizzle } from '@darun/provider-database';
import { eq, sql } from 'drizzle-orm';
import { products } from '../entities/ProductSchema';

export type ProductSourceTransaction = Parameters<Parameters<Drizzle['transaction']>[0]>[0];

/**
 * One database-local gate protects the Category membership set, including new Products.
 * Source transactions share it; Category updates take it exclusively before discovering owners.
 * Always acquire it before Product/Category row locks, and hold it through commit/rollback.
 * The two-int advisory namespace is reserved here for Product Category membership.
 */
export async function lockCategoryMembership(tx: ProductSourceTransaction, mode: 'shared' | 'exclusive') {
  await tx.execute(
    mode === 'exclusive'
      ? sql`select pg_advisory_xact_lock(1684107893, 1)`
      : sql`select pg_advisory_xact_lock_shared(1684107893, 1)`
  );
}

/** Every existing Product source writer locks this row before reading or writing source rows. */
export async function lockProductSource(tx: ProductSourceTransaction, productId: string) {
  await lockCategoryMembership(tx, 'shared');
  const [product] = await tx.select().from(products).where(eq(products.id, productId)).for('update');
  if (!product) {
    throw productNotFound();
  }
  return product;
}
