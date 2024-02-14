import { Database, DatabaseToken } from '@darun/provider-database';
import { Product, ProductRepository, ProductRepositoryToken } from '@products/domain';
import { desc, eq } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { products } from '../entities/ProductSchema';

@Service(ProductRepositoryToken)
export class MysqlProductRepository implements ProductRepository {
  constructor(@Inject(DatabaseToken) private readonly db: Database) {}

  async findOneById(id: string): Promise<Product | null> {
    return this.db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1)
      .then(rows => rows[0] ?? null);
  }

  async findTop4SortByCreatedAtDesc(): Promise<Product[]> {
    return this.db.select().from(products).orderBy(desc(products.createdAt)).limit(4);
  }
}
