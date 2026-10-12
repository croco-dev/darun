import {
  Product,
  ProductDescriptionEvidenceAssemblerToken,
  type IProductDescriptionEvidenceAssembler,
  type ProductDescriptionApplyStore,
  type ProductDescriptionJobEntity,
  productNotFound,
} from '@darun/products-domain';
import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { and, eq, isNull } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { type ProductDescriptionJobRow, productDescriptionJobs } from '../entities/ProductDescriptionJobSchema';
import { products } from '../entities/ProductSchema';

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

/**
 * 후보 적용의 좁은 트랜잭션 Postgres 어댑터.
 * 잠금 순서: product_description_jobs row(FOR UPDATE) → products row(FOR UPDATE).
 * materialize(PostgresqlProductResearchMaterializationRepository)와 동일한
 * job→product 방향이므로 두 경로가 겹쳐도 교착 방향이 어긋나지 않는다.
 * 스냅샷 검증·product 쓰기·조건부 job 확정을 하나의 트랜잭션에서 수행하므로
 * 동시 적용 경쟁은 하나만 성공하고 나머지는 alreadyApplied가 된다.
 */
@Service()
export class PostgresqlProductDescriptionApplyStore implements ProductDescriptionApplyStore {
  private tx: Tx | null = null;

  constructor(
    @Inject(DrizzleToken) private readonly db: Drizzle,
    @Inject(ProductDescriptionEvidenceAssemblerToken)
    private readonly evidenceAssembler?: IProductDescriptionEvidenceAssembler
  ) {}

  readonly transaction = {
    run: async <T>(work: () => Promise<T>): Promise<T> => {
      if (this.tx) {
        return work();
      }
      return this.db.transaction(async tx => {
        this.tx = tx;
        try {
          return await work();
        } finally {
          this.tx = null;
        }
      });
    },
  };

  private currentTx(): Tx {
    if (!this.tx) {
      throw new Error('PostgresqlProductDescriptionApplyStore는 transaction.run 안에서만 호출해야 합니다.');
    }
    return this.tx;
  }

  async findLockedJob(jobId: string): Promise<ProductDescriptionJobEntity | null> {
    const tx = this.currentTx();
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
    const tx = this.currentTx();
    const rows = await tx.select().from(products).where(eq(products.id, productId)).for('update').limit(1);
    const row = rows[0];
    return row ? toProduct(row) : null;
  }

  async assembleLocked(productId: string): Promise<{ evidenceHash: string; baseDescriptionHash: string }> {
    if (!this.evidenceAssembler) {
      throw new Error('ProductDescriptionEvidenceAssembler가 설정되지 않았습니다.');
    }
    // 잠근 job row 다음에 같은 트랜잭션 구간에서 스냅샷을 검증한다.
    // stub assembler(fake)는 해시를 그대로 반환하고, 운영 assembler는 잠금 구간
    // 밖의 최신 읽기를 제공한다. 어느 쪽도 후보 바이트를 재렌더링하지 않는다.
    const snapshot = await this.evidenceAssembler.assemble(productId);
    if (typeof snapshot.evidenceHash !== 'string' || typeof snapshot.baseDescriptionHash !== 'string') {
      throw new Error('스냅샷 검증에 필요한 해시가 없습니다.');
    }
    return { evidenceHash: snapshot.evidenceHash, baseDescriptionHash: snapshot.baseDescriptionHash };
  }

  async applyLocked(input: { productId: string; candidateHtml: string }): Promise<Product> {
    const tx = this.currentTx();
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
    const tx = this.currentTx();
    const rows = await tx
      .update(productDescriptionJobs)
      .set({ appliedAt, updatedAt: new Date() })
      .where(and(eq(productDescriptionJobs.id, jobId), isNull(productDescriptionJobs.appliedAt)))
      .returning();
    const row = rows[0];
    return row ? toJobEntity(row) : null;
  }
}
