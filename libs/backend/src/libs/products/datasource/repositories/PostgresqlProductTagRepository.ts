import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { ProductTagRepositoryToken, ProductTagRepository, ProductTag, ProductTagType } from '@products/domain';
import DataLoader from 'dataloader';
import { eq, inArray } from 'drizzle-orm';
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

  updateTagsToProduct(productId: string, tags: ProductTag[]): Promise<void> {
    return this.db.transaction(async tx => {
      const existingTags = await tx.select().from(productTags).where(eq(productTags.productId, productId));
      const removeTargetTags = existingTags.filter(tag => !tags.map(tag => tag.name).includes(tag.name));

      if (removeTargetTags.length > 0) {
        await tx.delete(productTags).where(
          inArray(
            productTags.id,
            removeTargetTags.map(tag => tag.id)
          )
        );
      }
      const newTags = tags.filter(tag => !existingTags.map(tag => tag.name).includes(tag.name));
      await tx.insert(productTags).values(newTags).returning();
    });
  }

  async findManyByProductId(productId: string): Promise<ProductTag[]> {
    return this.productIdLoader.load(productId);
  }
}
