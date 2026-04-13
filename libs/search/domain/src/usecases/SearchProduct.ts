import { Inject, Service } from "typedi";
import type { SearchableProductRepository } from "../repositories/SearchableProductRepository";
import { SearchableProductRepositoryToken } from "../repositories/SearchableProductRepository";

@Service()
export class SearchProduct {
  constructor(
    @Inject(SearchableProductRepositoryToken)
    private readonly searchableProductRepository: SearchableProductRepository,
  ) {}

  async execute({ query }: { query: string }) {
    const normalizedQuery = query.trim().toLowerCase();
    return this.searchableProductRepository.searchProduct(normalizedQuery);
  }
}
