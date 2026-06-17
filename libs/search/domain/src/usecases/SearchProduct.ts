import { Inject, Service } from 'typedi';
import type { SearchableProductRepository } from '../repositories/SearchableProductRepository';
import { SearchableProductRepositoryToken } from '../repositories/SearchableProductRepository';
import { SearchRanker } from '../services/SearchRanker';
import { SEARCH_CANDIDATE_MULTIPLIER, MAX_SEARCH_CANDIDATES } from '../services/SearchRankingPolicy';
import { SynonymExpander } from '../services/SynonymExpander';

@Service()
export class SearchProduct {
  constructor(
    @Inject(SearchableProductRepositoryToken)
    private readonly searchableProductRepository: SearchableProductRepository,
    private readonly synonymExpander: SynonymExpander = new SynonymExpander(),
    private readonly searchRanker: SearchRanker = new SearchRanker()
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
    const expandedQuery = this.synonymExpander.expand(normalizedQuery);
    const candidateLimit =
      limit !== undefined ? Math.min(limit * SEARCH_CANDIDATE_MULTIPLIER, MAX_SEARCH_CANDIDATES) : undefined;
    const products = await this.searchableProductRepository.searchProduct(expandedQuery, limit, candidateLimit);

    const ranked = this.searchRanker.rank(products);
    return limit !== undefined ? ranked.slice(0, limit) : ranked;
  }
}
