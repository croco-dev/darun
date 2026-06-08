import { SearchableProduct, SearchableProductRepository } from '@darun/search-domain';
import { SearchableProductRepositoryToken } from '@darun/search-domain';
import { Service } from 'typedi';
import { SearchableProductSchema } from '../entities/SearchableProductSchema';
import { SearchableProductModel } from '../entities/SearchableProductSchema';

@Service(SearchableProductRepositoryToken)
export class MongodbSearchableProductRepository implements SearchableProductRepository {
  async searchProduct(query: string, limit?: number, candidateLimit?: number): Promise<SearchableProduct[]> {
    const effectiveLimit = candidateLimit ?? limit ?? 20;
    return SearchableProductModel.aggregate<SearchableProductSchema & { readonly searchScore?: number }>([
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
              {
                text: {
                  query,
                  path: ['tags', 'category'],
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
      { $addFields: { searchScore: { $meta: 'searchScore' } } },
      { $limit: effectiveLimit },
    ]).then(products =>
      products.map(product => ({ ...product, id: product.productId, searchScore: product.searchScore }))
    );
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
        tags: product.tags,
        category: product.category,
        votes: product.votes ?? 0,
        createdAt: product.createdAt,
        publishedAt: product.publishedAt,
      },
      {
        upsert: true,
      }
    );

    return Boolean(upsertResult.acknowledged);
  }
}
