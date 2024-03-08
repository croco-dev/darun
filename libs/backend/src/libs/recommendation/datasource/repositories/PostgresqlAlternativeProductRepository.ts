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

  async findManyByProductId(productId: string): Promise<AlternativeProduct[]> {
    return this.productIdLoader.load(productId);
  }
}
