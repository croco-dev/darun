import {
  Product,
  ProductDescriptionApplyStoreToken,
  projectProductDescriptionEvidence,
  productDescriptionStaleCandidate,
  productNotFound,
  type ProductDescriptionApplyStore,
  type ProductDescriptionApplySession,
  type ProductDescriptionJobEntity,
} from '@darun/products-domain';
import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { jobDispatchStatus } from '@darun/utils-llm';
import { and, eq, isNull } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { type ProductDescriptionJobRow, productDescriptionJobs } from '../entities/ProductDescriptionJobSchema';
import { products } from '../entities/ProductSchema';
import { readProductDescriptionEvidenceSources } from './PostgresqlProductDescriptionEvidenceAssembler';
import { beginProductContentWrite } from './productContentSync';
import { lockProductSource, type ProductSourceTransaction } from './productSourceMutex';

function toJobEntity(row: ProductDescriptionJobRow): ProductDescriptionJobEntity {
  return {
    ...row,
    status: row.status as ProductDescriptionJobEntity['status'],
    dispatchStatus: jobDispatchStatus(row),
  };
}

function toProduct(row: typeof products.$inferSelect): Product {
  return new Product({
    ...row,
    ownedCompanyId: row.ownedCompanyId ?? undefined,
    description: row.description ?? undefined,
    publishedAt: row.publishedAt ?? undefined,
    updatedAt: row.updatedAt ?? undefined,
    categoryIds: row.categoryIds ?? [],
  });
}

/** Product-first mutex, fresh sources, candidate bytes and marker share one connection/commit. */
@Service(ProductDescriptionApplyStoreToken)
export class PostgresqlProductDescriptionApplyStore implements ProductDescriptionApplyStore {
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

  readonly transaction = {
    run: async <T>(work: (store: ProductDescriptionApplySession) => Promise<T>): Promise<T> =>
      this.db.transaction(tx => work(this.session(tx))),
  };

  private session(tx: ProductSourceTransaction): ProductDescriptionApplySession {
    return {
      findJob: async (jobId, lock) => {
        const query = tx.select().from(productDescriptionJobs).where(eq(productDescriptionJobs.id, jobId));
        const [row] = await (lock ? query.for('update') : query);
        return row ? toJobEntity(row) : null;
      },
      findLockedProduct: async productId => toProduct(await lockProductSource(tx, productId)),
      assembleLocked: async productId =>
        projectProductDescriptionEvidence(await readProductDescriptionEvidenceSources(tx, productId)),
      applyLocked: async input => {
        const finishContentWrite = await beginProductContentWrite(tx, input.productId);
        const [row] = await tx
          .update(products)
          .set({ description: input.candidateHtml, updatedAt: new Date() })
          .where(eq(products.id, input.productId))
          .returning();
        if (!row) throw productNotFound();
        const checkpoint = await finishContentWrite();
        return toProduct({ ...row, ...checkpoint });
      },
      markAppliedLocked: async (jobId, appliedAt) => {
        const [row] = await tx
          .update(productDescriptionJobs)
          .set({ appliedAt, updatedAt: appliedAt })
          .where(and(eq(productDescriptionJobs.id, jobId), isNull(productDescriptionJobs.appliedAt)))
          .returning();
        // A missing marker must rollback the content write, not fabricate historical success.
        if (!row) throw productDescriptionStaleCandidate();
        return toJobEntity(row);
      },
    };
  }
}
