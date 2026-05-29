import { Inject, Service } from "typedi";
import {
  votingRateLimitExceeded,
  votingDuplicateVote,
} from "../errors/VoteError";
import type { VoteRecordRepository } from "../repositories/VoteRecordRepository";
import { VoteRecordRepositoryToken } from "../repositories/VoteRecordRepository";
import { hashVoterIp } from "../utils/hashVoterIp";

function isUniqueConstraintViolation(error: unknown): boolean {
  if (error instanceof Error) {
    const anyError = error as { code?: string; constraint?: string };
    return anyError.code === '23505';
  }
  return false;
}

@Service()
export class UpvoteProduct {
  constructor(
    @Inject(VoteRecordRepositoryToken)
    private readonly voteRecordRepository: VoteRecordRepository,
  ) {}

  async execute({
    productId,
    voterIp,
  }: {
    productId: string;
    voterIp: string;
  }) {
    const voterIpHash = hashVoterIp(voterIp);

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentVoteCount =
      await this.voteRecordRepository.countByVoterIpHashSince(
        voterIpHash,
        oneMinuteAgo,
      );

    if (recentVoteCount >= 10) {
      throw votingRateLimitExceeded();
    }

    const alreadyVoted =
      await this.voteRecordRepository.existsByTargetIdAndVoterIpHash(
        productId,
        voterIpHash,
      );

    if (alreadyVoted) {
      throw votingDuplicateVote();
    }

    try {
      return await this.voteRecordRepository.upsertVoteWithRecord(
        productId,
        voterIpHash,
        (vote) => {
          vote.upvote();

          return vote;
        },
      );
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw votingDuplicateVote();
      }
      throw error;
    }
  }
}
