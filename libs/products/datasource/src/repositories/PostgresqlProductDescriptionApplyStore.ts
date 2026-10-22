import {
  Product,
  ProductDescriptionEvidenceAssembler,
  ProductDescriptionApplyStoreToken,
  type ProductDescriptionApplyTransaction,
  type ProductDescriptionApplyStore,
  type ProductDescriptionJobEntity,
  productNotFound,
} from '@darun/products-domain';
import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { and, eq, isNull } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { type ProductDescriptionJobRow, productDescriptionJobs } from '../entities/ProductDescriptionJobSchema';
import { products } from '../entities/ProductSchema';
import { PostgresqlProductRepository } from './PostgresqlProductRepository';
import { PostgresqlProductFeatureRepository } from './PostgresqlProductFeatureRepository';
import { PostgresqlCategoryRepository } from './PostgresqlCategoryRepository';
import { PostgresqlProductTagRepository } from './PostgresqlProductTagRepository';
import { PostgresqlProductLinkRepository } from './PostgresqlProductLinkRepository';
import { PostgresqlProductScreenshotRepository } from './PostgresqlProductScreenshotRepository';
import { PostgresqlProductFlowRepository } from './PostgresqlProductFlowRepository';
import { PostgresqlProductResearchJobRepository } from './PostgresqlProductResearchJobRepository';

type Tx = Parameters<Parameters<Drizzle['transaction']>[0]>[0];

function toJobEntity(row: ProductDescriptionJobRow): ProductDescriptionJobEntity {
  return {
    id: row.id,
    productId: row.productId,
    status: row.status as ProductDescriptionJobEntity['status'],
    message: row.message,
    error: row.error,
    evidenceHash: row.evidenceHash,
    baseDescriptionHash: row.baseDescriptionHash,
    candidateDocument: row.candidateDocument,
    candidateHtml: row.candidateHtml,
    writerModel: row.writerModel,
    reviewerModel: row.reviewerModel,
    writerPromptVersion: row.writerPromptVersion,
    reviewerPromptVersion: row.reviewerPromptVersion,
    rendererVersion: row.rendererVersion,
    appliedAt: row.appliedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
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

@Service(ProductDescriptionApplyStoreToken)
export class PostgresqlProductDescriptionApplyStore implements ProductDescriptionApplyStore {
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

  readonly transaction = {
    run: async <T>(work: (transaction: ProductDescriptionApplyTransaction) => Promise<T>): Promise<T> => {
      // SERIALIZABLE gives all evidence reads one snapshot and detects conflicting
      // product writes. A concurrent same-job winner can invalidate our snapshot;
      // restart the entire transaction to observe its appliedAt, never reuse its adapter.
      for (let attempt = 0; ; attempt++) {
        try {
          return await this.db.transaction(tx => work(new TransactionApplyStore(tx)), {
            isolationLevel: 'serializable',
          });
        } catch (error) {
          const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
          const cause = error && typeof error === 'object' && 'cause' in error ? error.cause : undefined;
          const causeCode = cause && typeof cause === 'object' && 'code' in cause ? cause.code : undefined;
          if ((code !== '40001' && causeCode !== '40001') || attempt >= 2) {
            throw error;
          }
        }
      }
    },
  };
}

class TransactionApplyStore implements ProductDescriptionApplyTransaction {
  constructor(private readonly tx: Tx) {}

  async findLockedJob(jobId: string): Promise<ProductDescriptionJobEntity | null> {
    const tx = this.tx;
    const rows = await tx
      .select()
      .from(productDescriptionJobs)
      .where(eq(productDescriptionJobs.id, jobId))
      .for('update')
      .limit(1);
    const row = rows[0];
    return row ? toJobEntity(row) : null;
  }

  async findLockedProduct(productId: string): Promise<Product | null> {
    const tx = this.tx;
    const rows = await tx.select().from(products).where(eq(products.id, productId)).for('update').limit(1);
    const row = rows[0];
    return row ? toProduct(row) : null;
  }

  async assembleLocked(productId: string): Promise<{ evidenceHash: string; baseDescriptionHash: string }> {
    const db = this.tx as unknown as Drizzle;
    // Fresh repository instances have no cached rows from another request; every read uses this tx.
    const assembler = new ProductDescriptionEvidenceAssembler(
      new PostgresqlProductRepository(db),
      new PostgresqlProductFeatureRepository(db),
      new PostgresqlCategoryRepository(db),
      new PostgresqlProductTagRepository(db),
      new PostgresqlProductLinkRepository(db),
      new PostgresqlProductScreenshotRepository(db),
      new PostgresqlProductFlowRepository(db),
      new PostgresqlProductResearchJobRepository(db)
    );
    const snapshot = await assembler.assemble(productId);
    return { evidenceHash: snapshot.evidenceHash, baseDescriptionHash: snapshot.baseDescriptionHash };
  }

  async applyLocked(input: { productId: string; candidateHtml: string }): Promise<Product> {
    const tx = this.tx;
    const rows = await tx.select().from(products).where(eq(products.id, input.productId)).for('update').limit(1);
    const row = rows[0];
    if (!row) {
      throw productNotFound();
    }
    // 저장된 후보 바이트 그대로 적용한다. 재렌더링하지 않는다.
    const updated = await tx
      .update(products)
      .set({ description: input.candidateHtml, updatedAt: new Date() })
      .where(eq(products.id, input.productId))
      .returning();
    const next = updated[0];
    if (!next) {
      throw productNotFound();
    }
    return toProduct(next);
  }

  async markAppliedIfUnappliedLocked(jobId: string, appliedAt: Date): Promise<ProductDescriptionJobEntity | null> {
    const tx = this.tx;
    const rows = await tx
      .update(productDescriptionJobs)
      .set({ appliedAt, updatedAt: new Date() })
      .where(and(eq(productDescriptionJobs.id, jobId), isNull(productDescriptionJobs.appliedAt)))
      .returning();
    const row = rows[0];
    return row ? toJobEntity(row) : null;
  }
}
