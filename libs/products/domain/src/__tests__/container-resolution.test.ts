import 'reflect-metadata';

import { Container } from 'typedi';
import { afterEach, describe, expect, it } from 'vitest';
import { ProductRepositoryToken } from '../repositories/ProductRepository';
import { RankedProductVoteRepositoryToken } from '../repositories/RankedProductVoteRepository';
import { ProductDescriptionEvidenceAssembler } from '../services/ProductDescriptionEvidenceAssembler';
import { GetRankedProducts } from '../usecases/GetRankedProducts';

describe('products dependency container', () => {
  afterEach(() => {
    Container.remove(GetRankedProducts);
    Container.remove(ProductRepositoryToken);
    Container.remove(RankedProductVoteRepositoryToken);
    Container.remove(ProductDescriptionEvidenceAssembler);
  });

  it('resolves ranking services without treating clocks as Function services', () => {
    Container.set(ProductRepositoryToken, {});
    Container.set(RankedProductVoteRepositoryToken, {});

    expect(() => Container.get(GetRankedProducts)).not.toThrow();
  });

  it('keeps assembler constructor injectable with optional extended repositories', () => {
    const assembler = new ProductDescriptionEvidenceAssembler(
      { findOneById: async () => null } as never,
      { findManyByProductId: async () => [] } as never,
      { findOneById: async () => null } as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never
    );
    expect(assembler).toBeDefined();
  });
});
