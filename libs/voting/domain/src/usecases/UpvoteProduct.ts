import { Inject, Service } from 'typedi';
import { VoteRepository } from '../repositories/VoteRepository';
import { VoteRepositoryToken } from '../repositories/VoteRepository';

@Service()
export class UpvoteProduct {
  constructor(
    @Inject(VoteRepositoryToken)
    private readonly voteRepository: VoteRepository
  ) {}

  async execute({ productId }: { productId: string }) {
    return this.voteRepository.upsertByTargetId(productId, vote => {
      vote.upvote();

      return vote;
    });
  }
}
