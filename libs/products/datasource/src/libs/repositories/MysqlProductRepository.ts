import { Product, ProductRepository, ProductRepositoryToken } from '@darun/products-domain';
import { Database, DatabaseToken } from '@darun/provider-database';
import { desc } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { products } from '../entities/ProductSchema';

@Service(ProductRepositoryToken)
export class MysqlProductRepository implements ProductRepository {
  constructor(@Inject(DatabaseToken) private readonly db: Database) {}

  async findTop4SortByCreatedAtDesc(): Promise<Product[]> {
    return this.db.select().from(products).orderBy(desc(products.createdAt)).limit(4);
  }
}
