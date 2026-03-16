import { Inject, Service } from 'typedi';
import { SearchableProductRepository } from '../repositories/SearchableProductRepository';
import { SearchableProductRepositoryToken } from '../repositories/SearchableProductRepository';

@Service()
export class SearchProduct {
  constructor(
    @Inject(SearchableProductRepositoryToken)
    private searchableProductRepository: SearchableProductRepository
  ) {}

  async execute({ query }: { query: string }) {
    return this.searchableProductRepository.searchProduct(query);
  }
}
