import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { Product, ProductRepository, ProductRepositoryToken } from '@products/domain';
import DataLoader from 'dataloader';
import { and, asc, count, desc, eq, gt, inArray, isNotNull, lt } from 'drizzle-orm';
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
        return ids.map(id => (groupByDocs[id] ? this.mapper(groupByDocs[id]) : null));
      },
      {
        cache: false,
      }
    );
  }

  updateById(id: string, modifier: (product: Product) => Product): Promise<Product> {
    return this.db.transaction(async tx => {
      const prevProduct = await tx
        .select()
        .from(products)
        .where(eq(products.id, id))
        .limit(1)
        .then(rows => (rows[0] ? this.mapper(rows[0]) : null));

      if (!prevProduct) {
        throw new Error('Product not found');
      }

      const updated = await tx
        .update(products)
        .set({ ...modifier(prevProduct), updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning();
      if (!updated[0]) {
        throw new Error('Product update failed');
      }

      return this.mapper(updated[0]);
    });
  }

  async findAllByBeforeIdAndLimit(limit: number, id?: string | undefined): Promise<Product[]> {
    return (
      await this.db
        .select()
        .from(products)
        .where(id ? and(gt(products.id, id)) : undefined)
        .limit(limit)
        .orderBy(asc(products.id))
        .then(rows => rows.map(row => this.mapper(row)))
    ).reverse();
  }

  async findAllByAfterIdAndLimit(limit: number, id?: string | undefined): Promise<Product[]> {
    return this.db
      .select()
      .from(products)
      .where(id ? and(lt(products.id, id)) : undefined)
      .limit(limit)
      .orderBy(desc(products.id))
      .then(rows => rows.map(row => this.mapper(row)));
  }

  async countAll(): Promise<number> {
    return this.db
      .select({ value: count() })
      .from(products)
      .then(rows => rows[0].value);
  }

  async insert(values: Product): Promise<Product | null> {
    return this.db.transaction(async tx => {
      const inserted = await tx
        .insert(products)
        .values({ ...values })
        .returning();

      return inserted[0] ? this.mapper(inserted[0]) : null;
    });
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
      .then(rows => (rows[0] ? this.mapper(rows[0]) : null));
  }

  async findOneById(id: string): Promise<Product | null> {
    return this.db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1)
      .then(rows => (rows[0] ? this.mapper(rows[0]) : null));
  }

  async findPublishedOneBySlug(slug: string): Promise<Product | null> {
    return this.db
      .select()
      .from(products)
      .where(and(eq(products.slug, slug), isNotNull(products.publishedAt)))
      .limit(1)
      .then(rows => (rows[0] ? this.mapper(rows[0]) : null));
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
      .then(rows => rows.map(row => this.mapper(row)));
  }

  private mapper<ProductType extends typeof products.$inferSelect | typeof products.$inferInsert>(
    schema: ProductType
  ): Product {
    return new Product({
      ...schema,
      description: schema.description ?? undefined,
      publishedAt: schema.publishedAt ?? undefined,
      updatedAt: schema.updatedAt ?? undefined,
    });
  }
}
