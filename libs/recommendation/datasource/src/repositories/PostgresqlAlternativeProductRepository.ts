import { Drizzle } from '@darun/provider-database';
import { DrizzleToken } from '@darun/provider-database';
import {
  AlternativeProduct,
  type AlternativeProductRepository,
  type AlternativeProductExclusion,
  alternativeProductConflict,
} from '@darun/recommendation-domain';
import { AlternativeProductRepositoryToken } from '@darun/recommendation-domain';
import DataLoader from 'dataloader';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { groupBy } from 'es-toolkit';
import { Inject, Service } from 'typedi';
import { alternativeProducts, alternativeProductExclusions } from '../entities/AlternativeProductSchema';

type Transaction = Parameters<Parameters<Drizzle['transaction']>[0]>[0];

const lockProduct = (tx: Transaction, productId: string) => {
  const lockKey = `alternative-products:${productId}`;
  return tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`);
};

@Service(AlternativeProductRepositoryToken)
export class PostgresqlAlternativeProductRepository implements AlternativeProductRepository {
  private productIdLoader: DataLoader<string, AlternativeProduct[]>;
  private readonly exclusionLoader = new DataLoader<string, AlternativeProductExclusion[]>(
    async productIds => {
      const rows = await this.db
        .select()
        .from(alternativeProductExclusions)
        .where(inArray(alternativeProductExclusions.productId, [...productIds]))
        .orderBy(alternativeProductExclusions.alternativeProductId);
      const rowsByProduct = groupBy(rows, row => row.productId);
      return productIds.map(productId => rowsByProduct[productId] ?? []);
    },
    { cache: false }
  );
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {
    this.productIdLoader = new DataLoader(
      async (productIds: readonly string[]) => {
        const docs = await this.db
          .select()
          .from(alternativeProducts)
          .where(inArray(alternativeProducts.productId, [...productIds]));

        const groupByDocs = groupBy(docs, doc => doc.productId);
        return productIds.map(productId => (groupByDocs[productId] || []).map(doc => this.toDomain(doc)));
      },
      {
        // Repository instances outlive requests; retain batching without stale result caching.
        cache: false,
      }
    );
  }

  private toDomain(
    doc: Pick<typeof alternativeProducts.$inferSelect, 'id' | 'productId' | 'alternativeProductId'>
  ): AlternativeProduct {
    return new AlternativeProduct({
      id: doc.id,
      productId: doc.productId,
      alternativeProductId: doc.alternativeProductId,
    });
  }

  async replaceByProductId(productId: string, alternativeProductIds: string[]): Promise<void> {
    const nextIds = [...new Set(alternativeProductIds.filter(Boolean))];
    await this.db.transaction(async tx => {
      // Manual selection and exclusion must see each other's committed state.
      await lockProduct(tx, productId);
      await this.assertNotExcluded(tx, productId, nextIds);
      const previous = await tx.select().from(alternativeProducts).where(eq(alternativeProducts.productId, productId));
      const nextIdSet = new Set(nextIds);
      const previousIdSet = new Set(previous.map(row => row.alternativeProductId));
      const removed = previous.filter(row => !nextIdSet.has(row.alternativeProductId));
      const added = nextIds.filter(id => !previousIdSet.has(id));

      if (removed.length > 0) {
        await tx.delete(alternativeProducts).where(
          inArray(
            alternativeProducts.id,
            removed.map(row => row.id)
          )
        );
      }
      if (added.length > 0) {
        await tx
          .insert(alternativeProducts)
          .values(added.map(alternativeProductId => ({ productId, alternativeProductId })));
      }
    });
    this.productIdLoader.clear(productId);
  }

  findExclusionsByProductId(productId: string): Promise<AlternativeProductExclusion[]> {
    return this.exclusionLoader.load(productId);
  }

  async exclude(exclusion: AlternativeProductExclusion): Promise<void> {
    const { productId, alternativeProductId } = exclusion;
    await this.db.transaction(async tx => {
      await lockProduct(tx, productId);
      const [manual] = await tx
        .select({ id: alternativeProducts.id })
        .from(alternativeProducts)
        .where(
          and(
            eq(alternativeProducts.productId, productId),
            eq(alternativeProducts.alternativeProductId, alternativeProductId)
          )
        )
        .limit(1);
      if (manual) {
        throw alternativeProductConflict('수동 대안에서 연결을 해제한 뒤 자동 대안에서 제외해 주세요.');
      }
      await tx.insert(alternativeProductExclusions).values(exclusion).onConflictDoNothing();
    });
  }

  async restore(productId: string, alternativeProductId: string): Promise<void> {
    await this.db.transaction(async tx => {
      await lockProduct(tx, productId);
      await tx
        .delete(alternativeProductExclusions)
        .where(
          and(
            eq(alternativeProductExclusions.productId, productId),
            eq(alternativeProductExclusions.alternativeProductId, alternativeProductId)
          )
        );
    });
  }

  private async assertNotExcluded(tx: Transaction, productId: string, alternativeProductIds: string[]): Promise<void> {
    if (!alternativeProductIds.length) return;

    const [excluded] = await tx
      .select({ alternativeProductId: alternativeProductExclusions.alternativeProductId })
      .from(alternativeProductExclusions)
      .where(
        and(
          eq(alternativeProductExclusions.productId, productId),
          inArray(alternativeProductExclusions.alternativeProductId, alternativeProductIds)
        )
      )
      .limit(1);
    if (excluded) {
      throw alternativeProductConflict('제외된 서비스의 제외를 해제한 뒤 수동 대안으로 연결해 주세요.');
    }
  }

  deleteMany(removedAlternatives: AlternativeProduct[]): Promise<boolean> {
    return this.db
      .transaction(async tx => {
        const result = await tx.delete(alternativeProducts).where(
          inArray(
            alternativeProducts.id,
            removedAlternatives.map(p => p.id)
          )
        );
        return result.count === removedAlternatives.length;
      })
      .then(result => {
        this.productIdLoader.clearAll();
        return result;
      });
  }
  createMany(newAlternatives: AlternativeProduct[]): Promise<AlternativeProduct[]> {
    return this.db
      .transaction(async tx => {
        const byProduct = groupBy(newAlternatives, alternative => alternative.productId);
        const productIds = Object.keys(byProduct).sort((left, right) => {
          if (left === right) return 0;
          return left < right ? -1 : 1;
        });
        // Concurrent batches acquire locks in the same order.
        for (const productId of productIds) {
          await lockProduct(tx, productId);
          await this.assertNotExcluded(
            tx,
            productId,
            byProduct[productId].map(alternative => alternative.alternativeProductId)
          );
        }
        return tx.insert(alternativeProducts).values(newAlternatives).returning();
      })
      .then(result => {
        this.productIdLoader.clearAll();
        return result.map(doc => this.toDomain(doc));
      });
  }
  create(data: AlternativeProduct): Promise<AlternativeProduct> {
    return this.db
      .transaction(async tx => {
        await lockProduct(tx, data.productId);
        await this.assertNotExcluded(tx, data.productId, [data.alternativeProductId]);
        const inserted = await tx
          .insert(alternativeProducts)
          .values({ ...data })
          .returning();

        const createdAlternative = inserted[0];

        if (!createdAlternative) {
          throw new Error('failed to create alternative product.');
        }

        return createdAlternative;
      })
      .then(result => {
        this.productIdLoader.clearAll();
        return this.toDomain(result);
      });
  }

  async findManyByProductId(productId: string): Promise<AlternativeProduct[]> {
    return this.productIdLoader.load(productId);
  }
}
