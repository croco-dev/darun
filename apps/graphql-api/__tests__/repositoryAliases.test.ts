import { RankedProductVoteRepositoryToken } from '@darun/products-domain';
import { VoteRepositoryToken } from '@darun/voting-domain';
import { Container } from 'typedi';
import { afterEach, describe, expect, it } from 'vitest';
import { registerRepositoryAliases } from '../src/config/repositoryAliases';

describe('repository aliases', () => {
  afterEach(() => {
    Container.remove(RankedProductVoteRepositoryToken);
    Container.remove(VoteRepositoryToken);
  });

  it('resolves the products ranking port through the voting repository token', () => {
    const voteRepository = {
      findByTargetId: () => Promise.resolve(null),
      upsertByTargetId: () => Promise.reject(new Error('not implemented')),
      findTopNByVoteCount: () => Promise.resolve([]),
    };

    Container.set(VoteRepositoryToken, voteRepository);
    registerRepositoryAliases();

    expect(Container.get(RankedProductVoteRepositoryToken)).toBe(voteRepository);
  });
});
