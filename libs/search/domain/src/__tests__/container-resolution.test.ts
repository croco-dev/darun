import 'reflect-metadata';

import { afterEach, describe, expect, it } from 'vitest';
import { Container } from 'typedi';
import { SearchableProductRepositoryToken } from '../repositories/SearchableProductRepository';
import { SearchProduct } from '../usecases/SearchProduct';

describe('search dependency container', () => {
  afterEach(() => {
    Container.remove(SearchProduct);
    Container.remove(SearchableProductRepositoryToken);
  });

  it('resolves search ranking services without treating clocks as Function services', () => {
    Container.set(SearchableProductRepositoryToken, {});

    expect(() => Container.get(SearchProduct)).not.toThrow();
  });
});
