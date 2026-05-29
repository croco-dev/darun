import { SearchableProduct, SearchableProductRepository } from '@darun/search-domain';
import { SearchableProductRepositoryToken } from '@darun/search-domain';
import { Service } from 'typedi';
import { SearchableProductSchema } from '../entities/SearchableProductSchema';
import { SearchableProductModel } from '../entities/SearchableProductSchema';

@Service(SearchableProductRepositoryToken)
export class MongodbSearchableProductRepository implements SearchableProductRepository {
  async searchProduct(query: string, limit = 20): Promise<SearchableProduct[]> {
    return SearchableProductModel.aggregate<SearchableProductSchema>([
      {
        $search: {
          index: 'searchable_products_index',
          compound: {
            should: [
              {
                text: {
                  query,
                  path: 'name',
                  fuzzy: {
                    maxEdits: 2,
                    maxExpansions: 256,
                  },
                  score: { boost: { value: 10 } },
                },
              },
              {
                text: {
                  query,
                  path: ['description', 'summary'],
                  fuzzy: {
                    maxEdits: 2,
                    maxExpansions: 256,
                  },
                },
              },
            ],
          },
        },
      },
      { $limit: limit },
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
