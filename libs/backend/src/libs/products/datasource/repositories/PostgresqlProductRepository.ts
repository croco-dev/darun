import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { Product, ProductRepository, ProductRepositoryToken } from '@products/domain';
import DataLoader from 'dataloader';
import { and, count, desc, eq, inArray, isNotNull } from 'drizzle-orm';
import { keyBy } from 'lodash';
import { Inject, Service } from 'typedi';
import { products } from '../entities/ProductSchema';

@Service(ProductRepositoryToken)
export class PostgresqlProductRepository implements ProductRepository {
  private publishedIdLoader: DataLoader<string, Product | null>;
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {
    this.publishedIdLoader = new DataLoader(
      async (ids: readonly string[]) => {
        const docs = await this.db
          .select()
          .from(products)
          .where(and(inArray(products.id, [...ids]), isNotNull(products.publishedAt)));

        const groupByDocs = keyBy(docs, 'id');
        return ids.map(id =>
          groupByDocs[id] ? { ...groupByDocs[id], description: groupByDocs[id]?.description ?? undefined } : null
        );
      },
      {
        cache: false,
      }
    );
  }

  async insert(values: Product): Promise<boolean> {
    const inserted = await this.db.insert(products).values({ ...values });

    return inserted.rowsAffected > 0;
  }

  async countPublishedAll(): Promise<number> {
    return this.db
      .select({ value: count() })
      .from(products)
      .where(isNotNull(products.publishedAt))
      .then(rows => rows[0].value);
  }

  async findOneBySlug(slug: string): Promise<Product | null> {
    return this.db
      .select()
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1)
      .then(rows => (rows[0] ? { ...rows[0], description: rows[0].description ?? undefined } : null));
  }

  async findPublishedOneBySlug(slug: string): Promise<Product | null> {
    return this.db
      .select()
      .from(products)
      .where(and(eq(products.slug, slug), isNotNull(products.publishedAt)))
      .limit(1)
      .then(rows => (rows[0] ? { ...rows[0], description: rows[0].description ?? undefined } : null));
  }

  async findPublishedOneById(id: string): Promise<Product | null> {
    return this.publishedIdLoader.load(id);
  }

  async findTopNSortByPublishedAtDesc(n: number): Promise<Product[]> {
    return this.db
      .select()
      .from(products)
      .where(isNotNull(products.publishedAt))
      .orderBy(desc(products.publishedAt))
      .limit(n)
      .then(rows => rows.map(row => ({ ...row, description: row.description ?? undefined })));
  }
}
