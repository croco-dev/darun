import { Token } from 'typedi';

export interface SearchProductVoteRepository {
  findByTargetIds(
    ids: readonly string[]
  ): Promise<ReadonlyArray<{ readonly targetId: string; readonly count: number }>>;
}

export const SearchProductVoteRepositoryToken = new Token<SearchProductVoteRepository>('SearchProductVoteRepository');
