import { Inject, Service } from 'typedi';
import type { SearchableProductRepository } from '../repositories/SearchableProductRepository';
import { SearchableProductRepositoryToken } from '../repositories/SearchableProductRepository';

@Service()
export class SearchProduct {
  constructor(
    @Inject(SearchableProductRepositoryToken)
    private readonly searchableProductRepository: SearchableProductRepository
  ) {}

  /**
   * Executes a product search with the given query.
   *
   * @param params.query - The search query string (will be trimmed and lowercased).
   * @param params.limit - Maximum number of results (optional).
   *                       This parameter is reserved for internal extension and
   *                       does not affect the existing GraphQL API schema.
   *                       When omitted, the repository default (`MongodbSearchableProductRepository`
   *                       uses `limit = 20`) is applied.
   */
  async execute({ query, limit }: { query: string; limit?: number }) {
    const normalizedQuery = query.trim().toLowerCase();
    return this.searchableProductRepository.searchProduct(normalizedQuery, limit);
  }
}
