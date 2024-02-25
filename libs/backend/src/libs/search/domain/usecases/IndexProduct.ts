import { Inject, Service } from 'typedi';
import { SearchableProduct } from '../entities/SearchableProduct';
import {
  SearchableProductRepository,
  SearchableProductRepositoryToken,
} from '../repositories/SearchableProductRepository';

@Service()
export class IndexProduct {
  constructor(
    @Inject(SearchableProductRepositoryToken) private searchableProductRepository: SearchableProductRepository
  ) {}

  async execute({
    id,
    name,
    slug,
    summary,
    description,
  }: {
    id: string;
    name: string;
    slug: string;
    summary: string;
    description?: string;
  }) {
    return this.searchableProductRepository.index(id, new SearchableProduct({ name, slug, summary, description }));
  }
}
