import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { ProductLink, ProductLinkRepository, ProductLinkRepositoryToken } from '@products/domain';
import DataLoader from 'dataloader';
import { inArray } from 'drizzle-orm';
import { groupBy } from 'lodash';
import { Inject, Service } from 'typedi';
import { productLinks } from '../entities/ProductLinksSchema';

@Service(ProductLinkRepositoryToken)
export class PostgresqlProductLinkRepository implements ProductLinkRepository {
  private productIdLoader: DataLoader<string, ProductLink[]>;
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {
    this.productIdLoader = new DataLoader(
      async (productIds: readonly string[]) => {
        const docs = await this.db
          .select()
          .from(productLinks)
          .where(inArray(productLinks.productId, [...productIds]));

        const groupByDocs = groupBy(docs, 'productId');
        return productIds.map(productId => groupByDocs[productId] || []);
      },
      {
        cache: false,
      }
    );
  }

  insert(link: ProductLink): Promise<ProductLink> {
    return this.db.transaction(async tx => {
      const inserted = await tx.insert(productLinks).values(link).returning();

      if (!inserted[0]) {
        throw new Error('Failed to insert product screenshot');
      }
      return inserted[0];
    });
  }

  async findManyByProductId(productId: string): Promise<ProductLink[]> {
    return this.productIdLoader.load(productId);
  }
}
