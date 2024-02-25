import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { Product, ProductRepository, ProductRepositoryToken } from '@products/domain';
import { and, count, desc, eq, isNotNull } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { products } from '../entities/ProductSchema';

@Service(ProductRepositoryToken)
export class MysqlProductRepository implements ProductRepository {
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

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
      .then(rows => ({ ...rows[0], description: rows[0].description ?? undefined }) ?? null);
  }

  async findPublishedOneBySlug(slug: string): Promise<Product | null> {
    return this.db
      .select()
      .from(products)
      .where(and(eq(products.slug, slug), isNotNull(products.publishedAt)))
      .limit(1)
      .then(rows => ({ ...rows[0], description: rows[0].description ?? undefined }) ?? null);
  }

  async findPublishedOneById(id: string): Promise<Product | null> {
    return this.db
      .select()
      .from(products)
      .where(and(eq(products.id, id), isNotNull(products.publishedAt)))
      .limit(1)
      .then(rows => ({ ...rows[0], description: rows[0].description ?? undefined }) ?? null);
  }

  async findTop4SortByPublishedAtDesc(): Promise<Product[]> {
    return this.db
      .select()
      .from(products)
      .where(isNotNull(products.publishedAt))
      .orderBy(desc(products.publishedAt))
      .limit(4)
      .then(rows => rows.map(row => ({ ...row, description: row.description ?? undefined })));
  }
}
