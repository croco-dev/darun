import 'reflect-metadata';

import { Container } from 'typedi';
import { afterEach, describe, expect, it } from 'vitest';
import { ProductRepositoryToken } from '../repositories/ProductRepository';
import { RankedProductVoteRepositoryToken } from '../repositories/RankedProductVoteRepository';
import { GetRankedProducts } from '../usecases/GetRankedProducts';

describe('products dependency container', () => {
  afterEach(() => {
    Container.remove(GetRankedProducts);
    Container.remove(ProductRepositoryToken);
    Container.remove(RankedProductVoteRepositoryToken);
  });

  it('resolves ranking services without treating clocks as Function services', () => {
    Container.set(ProductRepositoryToken, {});
    Container.set(RankedProductVoteRepositoryToken, {});

    expect(() => Container.get(GetRankedProducts)).not.toThrow();
  });
});
