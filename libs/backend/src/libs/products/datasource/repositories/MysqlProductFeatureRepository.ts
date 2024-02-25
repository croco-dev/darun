import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { ProductFeatureRepository, ProductFeatureRepositoryToken, ProductFeature } from '@products/domain';
import DataLoader from 'dataloader';
import { inArray } from 'drizzle-orm';
import { groupBy } from 'lodash';
import { Inject, Service } from 'typedi';
import { productFeatures } from '../entities/ProductFeaturesSchema';

@Service(ProductFeatureRepositoryToken)
export class MysqlProductFeatureRepository implements ProductFeatureRepository {
  private productIdLoader: DataLoader<string, ProductFeature[]>;
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {
    this.productIdLoader = new DataLoader(
      async (productIds: readonly string[]) => {
        const docs = await this.db
          .select()
          .from(productFeatures)
          .where(inArray(productFeatures.productId, [...productIds]));

        const groupByDocs = groupBy(docs, 'productId');
        return productIds.map(productId => groupByDocs[productId] || []);
      },
      {
        cache: false,
      }
    );
  }

  async findManyByProductId(productId: string): Promise<ProductFeature[]> {
    return this.productIdLoader.load(productId);
  }
}
