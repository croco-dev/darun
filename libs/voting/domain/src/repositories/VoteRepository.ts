import { Token } from 'typedi';
import { Vote } from '../entities/Vote';

export interface VoteRepository {
  upsertByTargetId(id: string, modifier: (vote: Vote) => Vote): Promise<Vote>;
  findByTargetId(productId: string): Promise<Vote | null>;
  findByTargetIds(ids: readonly string[]): Promise<Vote[]>;
  findTopNByVoteCount(n: number): Promise<Vote[]>;
}

export const VoteRepositoryToken = new Token<VoteRepository>('VoteRepository');
