import { Token } from 'typedi';
import type { Vote } from '../entities/Vote';
import type { VoteRecord } from '../entities/VoteRecord';

export interface VoteRecordRepository {
  existsByTargetIdAndVoterIpHash(targetId: string, voterIpHash: string): Promise<boolean>;
  countByVoterIpHashSince(voterIpHash: string, since: Date): Promise<number>;
  insert(record: VoteRecord): Promise<VoteRecord>;
  upsertVoteWithRecord(targetId: string, voterIpHash: string, modifier: (vote: Vote) => Vote): Promise<Vote>;
}

export const VoteRecordRepositoryToken = new Token<VoteRecordRepository>('VoteRecordRepository');
