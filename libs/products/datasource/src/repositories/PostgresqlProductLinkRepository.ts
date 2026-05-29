import { ProductLinkRepository } from '@darun/products-domain';
import { ProductLink, ProductLinkRepositoryToken } from '@darun/products-domain';
import { Drizzle } from '@darun/provider-database';
import { DrizzleToken } from '@darun/provider-database';
import DataLoader from 'dataloader';
import { eq, inArray } from 'drizzle-orm';
import { groupBy } from 'es-toolkit';
import { Inject, Service } from 'typedi';
import { productLinks } from '../entities/ProductLinksSchema';

@Service(ProductLinkRepositoryToken)
export class PostgresqlProductLinkRepository implements ProductLinkRepository {
  private productIdLoader: DataLoader<string, ProductLink[]>;
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {
    this.productIdLoader = new DataLoader<string, ProductLink[]>(
      async (productIds: readonly string[]) => {
        const docs = await this.db
          .select()
          .from(productLinks)
          .where(inArray(productLinks.productId, [...productIds]));

        const groupByDocs = groupBy(
          docs.map(doc => this.mapper(doc)),
          doc => doc.productId
        );
        return productIds.map(productId => groupByDocs[productId] || []);
      },
      {
        cache: true,
      }
    );
  }

  insert(link: ProductLink): Promise<ProductLink> {
    return this.db
      .transaction(async tx => {
        const inserted = await tx.insert(productLinks).values(link).returning();

        if (!inserted[0]) {
          throw new Error('Failed to insert product screenshot');
        }
        return this.mapper(inserted[0]);
      })
      .then(result => {
        this.productIdLoader.clearAll();
        return result;
      });
  }

  async findManyByProductId(productId: string): Promise<ProductLink[]> {
    return this.productIdLoader.load(productId);
  }

  updateById(linkId: string, modifier: (link: ProductLink) => ProductLink): Promise<ProductLink> {
    return this.db
      .transaction(async tx => {
        const prevLink = await tx
          .select()
          .from(productLinks)
          .where(eq(productLinks.id, linkId))
          .limit(1)
          .then(rows => (rows[0] ? this.mapper(rows[0]) : null));

        if (!prevLink) {
          throw new Error('ProductLink not found');
        }

        const updated = await tx
          .update(productLinks)
          .set({ ...modifier(prevLink) })
          .where(eq(productLinks.id, linkId))
          .returning();

        if (!updated[0]) {
          throw new Error('ProductLink update failed');
        }

        return this.mapper(updated[0]);
      })
      .then(result => {
        this.productIdLoader.clearAll();
        return result;
      });
  }

  private mapper(schema: typeof productLinks.$inferSelect | typeof productLinks.$inferInsert): ProductLink {
    return new ProductLink({
      ...schema,
    });
  }
}
