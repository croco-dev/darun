import { Drizzle, DrizzleToken } from '@darun/provider-database';
import DataLoader from 'dataloader';
import { inArray } from 'drizzle-orm';
import { groupBy } from 'lodash';
import { Inject, Service } from 'typedi';
import { AlternativeProduct, AlternativeProductRepository, AlternativeProductRepositoryToken } from '../../domain';
import { alternativeProducts } from '../entities/AlternativeProductSchema';

@Service(AlternativeProductRepositoryToken)
export class PostgresqlAlternativeProductRepository implements AlternativeProductRepository {
  private productIdLoader: DataLoader<string, AlternativeProduct[]>;
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {
    this.productIdLoader = new DataLoader(
      async (productIds: readonly string[]) => {
        const docs = await this.db
          .select()
          .from(alternativeProducts)
          .where(inArray(alternativeProducts.productId, [...productIds]));

        const groupByDocs = groupBy(docs, 'productId');
        return productIds.map(productId => groupByDocs[productId] || []);
      },
      {
        cache: false,
      }
    );
  }

  deleteMany(removedAlternatives: AlternativeProduct[]): Promise<boolean> {
    return this.db.transaction(async tx => {
      const result = await tx.delete(alternativeProducts).where(
        inArray(
          alternativeProducts.id,
          removedAlternatives.map(p => p.id)
        )
      );
      return result.count === removedAlternatives.length;
    });
  }
  createMany(newAlternatives: AlternativeProduct[]): Promise<AlternativeProduct[]> {
    return this.db.transaction(async tx => {
      return tx.insert(alternativeProducts).values(newAlternatives).returning();
    });
  }
  create(data: AlternativeProduct): Promise<AlternativeProduct> {
    return this.db.transaction(async tx => {
      const inserted = await tx
        .insert(alternativeProducts)
        .values({ ...data })
        .returning();

      return inserted[0] ?? null;
    });
  }

  async findManyByProductId(productId: string): Promise<AlternativeProduct[]> {
    return this.productIdLoader.load(productId);
  }
}
