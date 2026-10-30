import 'reflect-metadata';

import { Container } from 'typedi';
import { afterEach, describe, expect, it } from 'vitest';
import { SearchableProductRepositoryToken } from '../repositories/SearchableProductRepository';
import { SearchProductVoteRepositoryToken } from '../repositories/SearchProductVoteRepository';
import { SearchProduct } from '../usecases/SearchProduct';

describe('search dependency container', () => {
  afterEach(() => {
    Container.remove(SearchProduct);
    Container.remove(SearchableProductRepositoryToken);
    Container.remove(SearchProductVoteRepositoryToken);
  });

  it('resolves search ranking services without treating clocks as Function services', () => {
    Container.set(SearchableProductRepositoryToken, {});
    Container.set(SearchProductVoteRepositoryToken, {});

    expect(() => Container.get(SearchProduct)).not.toThrow();
  });
});
