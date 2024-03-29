import { Drizzle, DrizzleToken } from '@darun/provider-database';
import {
  ProductFeatureScreenshot,
  ProductFeatureScreenshotRepository,
  ProductFeatureScreenshotRepositoryToken,
} from '@products/domain';
import DataLoader from 'dataloader';
import { inArray } from 'drizzle-orm';
import { groupBy } from 'lodash';
import { Inject, Service } from 'typedi';
import { productFeatureScreenshots } from '../entities/ProductFeatureScreenshotsSchema';

@Service(ProductFeatureScreenshotRepositoryToken)
export class PostgresqlProductFeatureScreenshotRepository implements ProductFeatureScreenshotRepository {
  private featureIdLoader: DataLoader<string, ProductFeatureScreenshot[]>;
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {
    this.featureIdLoader = new DataLoader(
      async (featureIds: readonly string[]) => {
        const docs = await this.db
          .select()
          .from(productFeatureScreenshots)
          .where(inArray(productFeatureScreenshots.featureId, [...featureIds]));

        const groupByDocs = groupBy(docs, 'featureId');
        return featureIds.map(featureId => groupByDocs[featureId] || []);
      },
      {
        cache: false,
      }
    );
  }

  async findManyByFeatureIdSortByPriorityDesc(featureId: string): Promise<ProductFeatureScreenshot[]> {
    return this.featureIdLoader.load(featureId);
  }
}
