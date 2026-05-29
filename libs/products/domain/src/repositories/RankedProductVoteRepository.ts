import { Token } from 'typedi';

export interface RankedProductVoteRepository {
  findTopNByVoteCount(n: number): Promise<ReadonlyArray<{ readonly targetId: string; readonly count: number }>>;
}

export const RankedProductVoteRepositoryToken = new Token<RankedProductVoteRepository>('RankedProductVoteRepository');
