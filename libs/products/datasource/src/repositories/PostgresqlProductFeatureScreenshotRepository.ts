import { ProductFeatureScreenshot, ProductFeatureScreenshotRepository } from '@darun/products-domain';
import { ProductFeatureScreenshotRepositoryToken } from '@darun/products-domain';
import { Drizzle } from '@darun/provider-database';
import { DrizzleToken } from '@darun/provider-database';
import DataLoader from 'dataloader';
import { inArray } from 'drizzle-orm';
import { groupBy } from 'es-toolkit';
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

        const groupByDocs = groupBy(docs, doc => doc.featureId);
        return featureIds.map(featureId => groupByDocs[featureId] || []);
      },
      {
        cache: true,
      }
    );
  }

  async findManyByFeatureIdSortByPriorityDesc(featureId: string): Promise<ProductFeatureScreenshot[]> {
    return this.featureIdLoader.load(featureId);
  }
}
