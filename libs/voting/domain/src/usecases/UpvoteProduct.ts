import { Inject, Service } from 'typedi';
import type { VoteRecordRepository } from '../repositories/VoteRecordRepository';
import { VoteRecordRepositoryToken } from '../repositories/VoteRecordRepository';
import { hashVoterIp } from '../utils/hashVoterIp';

@Service()
export class UpvoteProduct {
  constructor(
    @Inject(VoteRecordRepositoryToken)
    private readonly voteRecordRepository: VoteRecordRepository
  ) {}

  async execute({ productId, voterIp }: { productId: string; voterIp: string }) {
    const voterIpHash = hashVoterIp(voterIp);

    return this.voteRecordRepository.incrementVote(productId, voterIpHash);
  }
}
