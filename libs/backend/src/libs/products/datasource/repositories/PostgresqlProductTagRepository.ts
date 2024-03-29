import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { ProductTagRepositoryToken, ProductTagRepository, ProductTag, ProductTagType } from '@products/domain';
import DataLoader from 'dataloader';
import { inArray } from 'drizzle-orm';
import { groupBy } from 'lodash';
import { Inject, Service } from 'typedi';
import { productTags } from '../entities/ProductTagsSchema';

@Service(ProductTagRepositoryToken)
export class PostgresqlProductTagRepository implements ProductTagRepository {
  private productIdLoader: DataLoader<string, ProductTag[]>;
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {
    this.productIdLoader = new DataLoader(
      async (productIds: readonly string[]) => {
        const docs = await this.db
          .select()
          .from(productTags)
          .where(inArray(productTags.productId, [...productIds]))
          .then(rows => rows.map(row => ({ ...row, type: ProductTagType[row.type as keyof typeof ProductTagType] })));

        const groupByDocs = groupBy(docs, 'productId');
        return productIds.map(productId => groupByDocs[productId] || []);
      },
      {
        cache: false,
      }
    );
  }

  async findManyByProductId(productId: string): Promise<ProductTag[]> {
    return this.productIdLoader.load(productId);
  }
}
