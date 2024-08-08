import { Token } from 'typedi';
import { Vote } from '../entities/Vote';

export interface VoteRepository {
  upsertByTargetId(id: string, modifier: (vote: Vote) => Vote): Promise<Vote>;
  findByTargetId(productId: string): Promise<Vote | null>;
}

export const VoteRepositoryToken = new Token<VoteRepository>('VoteRepository');
