import { ProductLinkRepository } from '@darun/products-domain';
import {
  ProductLink,
  ProductLinkRepositoryToken,
  productInvalidArgs,
  productLinkInsertFailed,
  productLinkNotFound,
  productUpdateFailed,
} from '@darun/products-domain';
import { Drizzle } from '@darun/provider-database';
import { DrizzleToken } from '@darun/provider-database';
import DataLoader from 'dataloader';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { groupBy } from 'es-toolkit';
import { Inject, Service } from 'typedi';
import { productLinks } from '../entities/ProductLinksSchema';
import { beginProductContentWrite } from './productContentSync';

@Service(ProductLinkRepositoryToken)
export class PostgresqlProductLinkRepository implements ProductLinkRepository {
  private productIdLoader: DataLoader<string, ProductLink[]>;
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {
    this.productIdLoader = new DataLoader<string, ProductLink[]>(
      async (productIds: readonly string[]) => {
        const docs = await this.db
          .select()
          .from(productLinks)
          .where(inArray(productLinks.productId, [...productIds]))
          .orderBy(asc(productLinks.createdAt), asc(productLinks.id));

        const groupByDocs = groupBy(
          docs.map(doc => this.mapper(doc)),
          doc => doc.productId
        );
        return productIds.map(productId => groupByDocs[productId] || []);
      },
      {
        // Repository instances outlive requests; retain batching without stale result caching.
        cache: false,
      }
    );
  }

  insert(link: ProductLink): Promise<ProductLink> {
    return this.db
      .transaction(async tx => {
        const finishContentWrite = await beginProductContentWrite(tx, link.productId);
        const inserted = await tx.insert(productLinks).values(link).returning();

        if (!inserted[0]) {
          throw productLinkInsertFailed();
        }
        await finishContentWrite();
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

  updateById(linkId: string, productId: string, modifier: (link: ProductLink) => ProductLink): Promise<ProductLink> {
    return this.db
      .transaction(async tx => {
        const finishContentWrite = await beginProductContentWrite(tx, productId);
        const prevLink = await tx
          .select()
          .from(productLinks)
          .where(eq(productLinks.id, linkId))
          .limit(1)
          .then(rows => (rows[0] ? this.mapper(rows[0]) : null));

        if (!prevLink) {
          throw productLinkNotFound();
        }

        if (prevLink.productId !== productId) {
          throw productInvalidArgs();
        }

        const next = modifier(prevLink);
        const updated = await tx
          .update(productLinks)
          .set({ title: next.title, link: next.link, displayLink: next.displayLink, iconUrl: next.iconUrl })
          .where(and(eq(productLinks.id, linkId), eq(productLinks.productId, productId)))
          .returning();

        if (!updated[0]) {
          throw productUpdateFailed();
        }

        await finishContentWrite();
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
