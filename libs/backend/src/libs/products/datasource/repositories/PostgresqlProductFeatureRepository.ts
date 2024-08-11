import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { ProductFeature, ProductFeatureRepository, ProductFeatureRepositoryToken } from '@products/domain';
import DataLoader from 'dataloader';
import { eq, inArray } from 'drizzle-orm';
import { groupBy } from 'lodash';
import { Inject, Service } from 'typedi';
import { productFeatures } from '../entities/ProductFeaturesSchema';

@Service(ProductFeatureRepositoryToken)
export class PostgresqlProductFeatureRepository implements ProductFeatureRepository {
  private productIdLoader: DataLoader<string, ProductFeature[], string>;
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {
    this.productIdLoader = new DataLoader<string, ProductFeature[]>(
      async (productIds: readonly string[]) => {
        const docs = await this.db
          .select()
          .from(productFeatures)
          .where(inArray(productFeatures.productId, [...productIds]));

        const groupByDocs = groupBy(
          docs.map(doc => this.mapper(doc)),
          'productId'
        );

        return productIds.map(productId => groupByDocs[productId] ?? []);
      },
      {
        cache: false,
      }
    );
  }

  insert(newFeature: ProductFeature): Promise<ProductFeature> {
    return this.db.transaction(async tx => {
      const inserted = await tx
        .insert(productFeatures)
        .values({ ...newFeature })
        .returning();

      return this.mapper(inserted[0]);
    });
  }

  updateById(featureId: string, modifier: (feature: ProductFeature) => ProductFeature): Promise<ProductFeature> {
    return this.db.transaction(async tx => {
      const prevFeature = await tx
        .select()
        .from(productFeatures)
        .where(eq(productFeatures.id, featureId))
        .limit(1)
        .then(rows => (rows[0] ? this.mapper(rows[0]) : null));

      if (!prevFeature) {
        throw new Error('ProductFeature not found');
      }

      const updated = await tx
        .update(productFeatures)
        .set({ ...modifier(prevFeature) })
        .where(eq(productFeatures.id, featureId))
        .returning();
      if (!updated[0]) {
        throw new Error('ProductFeature update failed');
      }

      return this.mapper(updated[0]);
    });
  }

  async findOneById(id: string): Promise<ProductFeature | null> {
    return this.db
      .select()
      .from(productFeatures)
      .where(eq(productFeatures.id, id))
      .limit(1)
      .then(rows => (rows[0] ? this.mapper(rows[0]) : null));
  }

  async findManyByProductId(productId: string): Promise<ProductFeature[]> {
    return this.productIdLoader.load(productId);
  }

  private mapper(schema: typeof productFeatures.$inferSelect | typeof productFeatures.$inferInsert): ProductFeature {
    return new ProductFeature({
      ...schema,
      summary: schema.summary ?? null,
    });
  }
}
