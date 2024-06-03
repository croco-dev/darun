import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { ProductScreenshot, ProductScreenshotRepository, ProductScreenshotRepositoryToken } from '@products/domain';
import DataLoader from 'dataloader';
import { inArray } from 'drizzle-orm';
import { groupBy } from 'lodash';
import { Inject, Service } from 'typedi';
import { productScreenshots } from '../entities/ProductScreenshotsSchema';

@Service(ProductScreenshotRepositoryToken)
export class PostgresqlProductScreenshotRepository implements ProductScreenshotRepository {
  private productIdLoader: DataLoader<string, ProductScreenshot[]>;
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {
    this.productIdLoader = new DataLoader(
      async (productIds: readonly string[]) => {
        const docs = await this.db
          .select()
          .from(productScreenshots)
          .where(inArray(productScreenshots.productId, [...productIds]));

        const groupByDocs = groupBy(docs, 'productId');
        return productIds.map(productId => groupByDocs[productId] || []);
      },
      {
        cache: false,
      }
    );
  }

  insert(productScreenshot: ProductScreenshot): Promise<ProductScreenshot> {
    return this.db.transaction(async tx => {
      const inserted = await tx.insert(productScreenshots).values(productScreenshot).returning();

      if (!inserted[0]) {
        throw new Error('Failed to insert product screenshot');
      }
      return inserted[0];
    });
  }

  async findManyByProductIdSortByPriorityDesc(productId: string): Promise<ProductScreenshot[]> {
    return this.productIdLoader.load(productId);
  }
}
