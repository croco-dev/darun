import { SearchableProduct, SearchableProductRepository, SearchableProductRepositoryToken } from '@search/domain';
import { Service } from 'typedi';
import { SearchableProductModel } from '../entities/SearchableProductSchema';

@Service(SearchableProductRepositoryToken)
export class MongodbSearchableProductRepository implements SearchableProductRepository {
  async index(id: string, product: SearchableProduct): Promise<boolean> {
    const upsertResult = await SearchableProductModel.updateOne(
      {
        productId: id,
      },
      {
        slug: product.slug,
        name: product.name,
        summary: product.summary,
        description: product.description,
      },
      {
        upsert: true,
      }
    );

    return Boolean(upsertResult.acknowledged);
  }
}
