import { Token } from 'typedi';
import { SearchableProduct } from '../entities/SearchableProduct';

export interface SearchableProductRepository {
  index(id: string, product: SearchableProduct): Promise<boolean>;
}

export const SearchableProductRepositoryToken = new Token<SearchableProductRepository>('SearchableProductRepository');
