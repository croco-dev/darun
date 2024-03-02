import { SearchableProduct, SearchableProductRepository, SearchableProductRepositoryToken } from '@search/domain';
import { Service } from 'typedi';
import { SearchableProductModel, SearchableProductSchema } from '../entities/SearchableProductSchema';

@Service(SearchableProductRepositoryToken)
export class MongodbSearchableProductRepository implements SearchableProductRepository {
  async searchProduct(query: string): Promise<SearchableProduct[]> {
    return SearchableProductModel.aggregate<SearchableProductSchema>([
      {
        $search: {
          index: 'searchable_products_index',
          text: {
            query,
            path: ['name', 'description', 'summary'],
            fuzzy: {
              maxEdits: 2,
              maxExpansions: 256,
            },
          },
        },
      },
      { $limit: 20 },
    ]).then(products => products.map(product => ({ ...product, id: product.productId })));
  }
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
