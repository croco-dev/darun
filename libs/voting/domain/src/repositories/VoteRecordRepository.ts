import { Token } from 'typedi';
import { Vote } from '../entities/Vote';

export interface VoteRecordRepository {
  incrementVote(targetId: string, voterIpHash: string): Promise<Vote>;
}

export const VoteRecordRepositoryToken = new Token<VoteRecordRepository>('VoteRecordRepository');
