import { Inject, Service } from 'typedi';
import {
  SearchableProductRepository,
  SearchableProductRepositoryToken,
} from '../repositories/SearchableProductRepository';

@Service()
export class SearchProduct {
  constructor(
    @Inject(SearchableProductRepositoryToken) private searchableProductRepository: SearchableProductRepository
  ) {}

  async execute({ query }: { query: string }) {
    return this.searchableProductRepository.searchProduct(query);
  }
}
