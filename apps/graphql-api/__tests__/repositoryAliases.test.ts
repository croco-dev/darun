import { ScreenshotUploadProductReaderToken } from '@darun/images-domain';
import { ProductRepositoryToken } from '@darun/products-domain';
import { RankedProductVoteRepositoryToken } from '@darun/products-domain';
import { SearchProductVoteRepositoryToken } from '@darun/search-domain';
import { VoteRepositoryToken } from '@darun/voting-domain';
import { Container } from 'typedi';
import { afterEach, describe, expect, it } from 'vitest';
import { registerRepositoryAliases } from '../src/config/repositoryAliases';

describe('repository aliases', () => {
  afterEach(() => {
    Container.remove(ScreenshotUploadProductReaderToken);
    Container.remove(ProductRepositoryToken);
    Container.remove(RankedProductVoteRepositoryToken);
    Container.remove(SearchProductVoteRepositoryToken);
    Container.remove(VoteRepositoryToken);
  });

  it('resolves screenshot owners through the existing product repository', async () => {
    const product = { id: '01ARZ3NDEKTSV4RRFFQ69G5FAV' };
    Container.set({ id: ProductRepositoryToken, value: { findOneBySlug: async () => product } });
    registerRepositoryAliases();
    expect(await Container.get(ScreenshotUploadProductReaderToken).findOneBySlug('My_Product')).toBe(product);
  });

  it('resolves the products ranking port through the voting repository token', () => {
    const voteRepository = {
      findByTargetId: () => Promise.resolve(null),
      findByTargetIds: () => Promise.resolve([]),
      upsertByTargetId: () => Promise.reject(new Error('not implemented')),
      findTopNByVoteCount: () => Promise.resolve([]),
    };

    Container.set(VoteRepositoryToken, voteRepository);
    registerRepositoryAliases();

    expect(Container.get(RankedProductVoteRepositoryToken)).toBe(voteRepository);
    expect(Container.get(SearchProductVoteRepositoryToken)).toBe(voteRepository);
  });
});
