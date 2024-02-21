import { Database, DatabaseToken } from '@darun/provider-database';
import { Product, ProductRepository, ProductRepositoryToken } from '@products/domain';
import { and, count, desc, eq, isNotNull } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { products } from '../entities/ProductSchema';

@Service(ProductRepositoryToken)
export class MysqlProductRepository implements ProductRepository {
  constructor(@Inject(DatabaseToken) private readonly db: Database) {}

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
      .then(rows => rows[0] ?? null);
  }

  async findPublishedOneBySlug(slug: string): Promise<Product | null> {
    return this.db
      .select()
      .from(products)
      .where(and(eq(products.slug, slug), isNotNull(products.publishedAt)))
      .limit(1)
      .then(rows => rows[0] ?? null);
  }

  async findPublishedOneById(id: string): Promise<Product | null> {
    return this.db
      .select()
      .from(products)
      .where(and(eq(products.id, id), isNotNull(products.publishedAt)))
      .limit(1)
      .then(rows => rows[0] ?? null);
  }

  async findTop4SortByPublishedAtDesc(): Promise<Product[]> {
    return this.db
      .select()
      .from(products)
      .where(isNotNull(products.publishedAt))
      .orderBy(desc(products.publishedAt))
      .limit(4);
  }
}
