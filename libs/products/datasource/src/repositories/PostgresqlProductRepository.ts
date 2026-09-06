import { ProductRepository } from '@darun/products-domain';
import { Product, ProductRepositoryToken, productNotFound, productUpdateFailed } from '@darun/products-domain';
import { Drizzle } from '@darun/provider-database';
import { DrizzleToken } from '@darun/provider-database';
import DataLoader from 'dataloader';
import { and, asc, count, desc, eq, gt, inArray, isNotNull, lt, sql } from 'drizzle-orm';
import { keyBy } from 'es-toolkit';
import { Inject, Service } from 'typedi';
import { products } from '../entities/ProductSchema';

@Service(ProductRepositoryToken)
export class PostgresqlProductRepository implements ProductRepository {
  private idLoader: DataLoader<string, Product | null>;
  private publishedIdLoader: DataLoader<string, Product | null>;

  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {
    this.idLoader = new DataLoader(async (ids: readonly string[]) => this.findByIdsInternal(ids), {
      cache: true,
    });
    this.publishedIdLoader = new DataLoader(async (ids: readonly string[]) => this.findPublishedByIdsInternal(ids), {
      cache: true,
    });
  }

  async findPublishedByIds(ids: string[]): Promise<(Product | null)[]> {
    const results = await this.findPublishedByIdsInternal(ids);

    ids.forEach((id, index) => {
      this.publishedIdLoader.prime(id, results[index] ?? null);
    });

    return results;
  }

  updateById(id: string, modifier: (product: Product) => Product): Promise<Product> {
    return this.db
      .transaction(async tx => {
        const prevProduct = await tx
          .select()
          .from(products)
          .where(eq(products.id, id))
          .limit(1)
          .then(rows => (rows[0] ? this.mapper(rows[0]) : null));

        if (!prevProduct) {
          throw productNotFound();
        }

        const updated = await tx
          .update(products)
          .set({ ...modifier(prevProduct), updatedAt: new Date() })
          .where(eq(products.id, id))
          .returning();
        if (!updated[0]) {
          throw productUpdateFailed();
        }

        return this.mapper(updated[0]);
      })
      .then(result => {
        this.idLoader.clear(id);
        this.publishedIdLoader.clearAll();
        return result;
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

  async findPublishedByAfterIdAndLimit(limit: number, id?: string | undefined): Promise<Product[]> {
    return this.db
      .select()
      .from(products)
      .where(and(isNotNull(products.publishedAt), id ? lt(products.id, id) : undefined))
      .limit(limit)
      .orderBy(desc(products.id))
      .then(rows => rows.map(row => this.mapper(row)));
  }

  async countAll(): Promise<number> {
    return this.db
      .select({ value: count() })
      .from(products)
      .then(rows => Number(rows[0]?.value ?? 0));
  }

  async insert(values: Product): Promise<Product | null> {
    return this.db
      .transaction(async tx => {
        const inserted = await tx
          .insert(products)
          .values({ ...values })
          .returning();

        return inserted[0] ? this.mapper(inserted[0]) : null;
      })
      .then(result => {
        if (result?.id) {
          this.idLoader.clear(result.id);
        }
        this.publishedIdLoader.clearAll();
        return result;
      });
  }

  async countPublishedAll(): Promise<number> {
    return this.db
      .select({ value: count() })
      .from(products)
      .where(isNotNull(products.publishedAt))
      .then(rows => Number(rows[0]?.value ?? 0));
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
    return this.idLoader.load(id);
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
    return this.findPublishedByIds([id]).then(results => results[0] ?? null);
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

  async findPublishedByCategoryId(categoryId: string): Promise<Product[]> {
    return this.db
      .select()
      .from(products)
      .where(
        and(isNotNull(products.publishedAt), sql`${products.categoryIds}::jsonb @> ${JSON.stringify([categoryId])}`)
      )
      .orderBy(desc(products.publishedAt))
      .then(rows => rows.map(row => this.mapper(row)));
  }

  async findPublishedByCategoryIdAndLimit(categoryId: string, limit: number): Promise<Product[]> {
    return this.db
      .select()
      .from(products)
      .where(
        and(isNotNull(products.publishedAt), sql`${products.categoryIds}::jsonb @> ${JSON.stringify([categoryId])}`)
      )
      .orderBy(desc(products.publishedAt))
      .limit(limit)
      .then(rows => rows.map(row => this.mapper(row)));
  }

  private async findPublishedByIdsInternal(ids: readonly string[]): Promise<(Product | null)[]> {
    if (!ids.length) {
      return [];
    }

    const docs = await this.db
      .select()
      .from(products)
      .where(and(inArray(products.id, [...ids]), isNotNull(products.publishedAt)));

    const groupByDocs = keyBy(docs, doc => doc.id);

    return ids.map(id => (groupByDocs[id] ? this.mapper(groupByDocs[id]) : null));
  }

  private async findByIdsInternal(ids: readonly string[]): Promise<(Product | null)[]> {
    if (!ids.length) {
      return [];
    }

    const docs = await this.db
      .select()
      .from(products)
      .where(inArray(products.id, [...ids]));

    const groupByDocs = keyBy(docs, doc => doc.id);

    return ids.map(id => (groupByDocs[id] ? this.mapper(groupByDocs[id]) : null));
  }

  private mapper<ProductType extends typeof products.$inferSelect | typeof products.$inferInsert>(
    schema: ProductType
  ): Product {
    return new Product({
      ...schema,
      ownedCompanyId: schema.ownedCompanyId ?? undefined,
      description: schema.description ?? undefined,
      publishedAt: schema.publishedAt ?? undefined,
      updatedAt: schema.updatedAt ?? undefined,
      categoryIds: schema.categoryIds ?? [],
    });
  }
}
