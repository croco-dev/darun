import { Inject, Service } from 'typedi';
import { votingRateLimitExceeded, votingDuplicateVote } from '../errors/VoteError';
import { VoteRecordRepository } from '../repositories/VoteRecordRepository';
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

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentVoteCount = await this.voteRecordRepository.countByVoterIpHashSince(voterIpHash, oneMinuteAgo);

    if (recentVoteCount >= 10) {
      throw votingRateLimitExceeded();
    }

    const alreadyVoted = await this.voteRecordRepository.existsByTargetIdAndVoterIpHash(productId, voterIpHash);

    if (alreadyVoted) {
      throw votingDuplicateVote();
    }

    return this.voteRecordRepository.upsertVoteWithRecord(productId, voterIpHash, vote => {
      vote.upvote();

      return vote;
    });
  }
}
