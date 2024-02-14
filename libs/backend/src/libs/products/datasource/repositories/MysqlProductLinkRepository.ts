import { Database, DatabaseToken } from '@darun/provider-database';
import { ProductLink, ProductLinkRepository, ProductLinkRepositoryToken } from '@products/domain';
import { eq } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { productLinks } from '../entities/ProductLinksSchema';

@Service(ProductLinkRepositoryToken)
export class MysqlProductLinkRepository implements ProductLinkRepository {
  constructor(@Inject(DatabaseToken) private readonly db: Database) {}

  async findManyByProductId(productId: string): Promise<ProductLink[]> {
    return this.db.select().from(productLinks).where(eq(productLinks.productId, productId));
  }
}
