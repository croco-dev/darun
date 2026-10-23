import { SearchableProduct, SearchableProductRepository } from '@darun/search-domain';
import { SearchableProductRepositoryToken } from '@darun/search-domain';
import { Inject, Service } from 'typedi';
import { SearchableProductSchema } from '../entities/SearchableProductSchema';
import { SearchableProductModel } from '../entities/SearchableProductSchema';
import { MongodbSearchConnectionToken, SearchUnavailableError } from '../MongodbSearchConnection';
import { searchRevision, storedSearchRevision, SearchRevisionInvalidError } from './searchRevision';

@Service(SearchableProductRepositoryToken)
export class MongodbSearchableProductRepository implements SearchableProductRepository {
  constructor(@Inject(MongodbSearchConnectionToken) private readonly connect: () => void | Promise<void>) {}
  private identityReady?: Promise<void>;

  private ensureIdentity(): Promise<void> {
    this.identityReady ??= (async () => {
      await SearchableProductModel.init();
      const duplicates = await SearchableProductModel.collection
        .aggregate([
          { $group: { _id: '$productId', count: { $sum: 1 } } },
          { $match: { count: { $gt: 1 } } },
          { $limit: 1 },
        ])
        .toArray();
      if (duplicates.length) throw new Error('SEARCH_DUPLICATE_PRODUCT_ID: 중복 검색 문서를 먼저 검토해야 합니다.');
      await SearchableProductModel.collection.createIndex(
        { productId: 1 },
        { unique: true, name: 'search_product_identity' }
      );
    })().catch(error => {
      this.identityReady = undefined;
      throw error;
    });
    return this.identityReady;
  }

  private async ensureConnected(): Promise<void> {
    try {
      await this.connect();
    } catch {
      throw new SearchUnavailableError();
    }
  }

  async searchProduct(query: string, limit?: number, candidateLimit?: number): Promise<SearchableProduct[]> {
    await this.ensureConnected();
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
    const revision = searchRevision(product.sourceRevision);
    await this.ensureConnected();
    await this.ensureIdentity();
    const collection = SearchableProductModel.collection;
    const current = await collection.findOne({ productId: id }, { promoteLongs: false });
    if (current) storedSearchRevision(current);
    const payload = {
      productId: id,
      slug: product.slug,
      name: product.name,
      summary: product.summary,
      description: product.description ?? '',
      tags: product.tags,
      category: product.category,
      createdAt: product.createdAt,
      publishedAt: product.publishedAt,
      sourceRevision: revision,
    };
    // Missing is the only legacy form. The invalid branch deliberately aborts the
    // atomic pipeline, so malformed revisions cannot be overwritten after a race.
    const pipeline = [
      {
        $replaceWith: {
          $cond: [
            { $in: [{ $type: '$sourceRevision' }, ['missing', 'long']] },
            {
              $cond: [
                {
                  $or: [
                    { $eq: [{ $type: '$sourceRevision' }, 'missing'] },
                    { $lt: ['$sourceRevision', { $literal: revision }] },
                  ],
                },
                {
                  $mergeObjects: [
                    '$$ROOT',
                    { $literal: payload },
                    {
                      votes: {
                        $cond: [{ $eq: [{ $type: '$votes' }, 'missing'] }, product.votes ?? 0, '$votes'],
                      },
                    },
                  ],
                },
                '$$ROOT',
              ],
            },
            { $convert: { input: 'SEARCH_REVISION_INVALID', to: 'long' } },
          ],
        },
      },
    ];
    try {
      const result = await collection.updateOne({ productId: id }, pipeline, { upsert: true });
      return result.acknowledged;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 241) throw new SearchRevisionInvalidError();
      if (!(error instanceof Error && 'code' in error && error.code === 11000)) throw error;
      // Concurrent inserts share the unique identity. Never delete or replace the winner.
      const winner = await collection.findOne({ productId: id }, { promoteLongs: false });
      if (!winner) throw error;
      if (storedSearchRevision(winner) >= BigInt(revision.toString())) return true;
      const result = await collection.updateOne({ productId: id }, pipeline);
      return result.acknowledged;
    }
  }
}
