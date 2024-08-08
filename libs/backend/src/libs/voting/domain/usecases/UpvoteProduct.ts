import { Inject, Service } from 'typedi';

import { VoteRepository, VoteRepositoryToken } from '../repositories/VoteRepository';

@Service()
export class UpvoteProduct {
  constructor(@Inject(VoteRepositoryToken) private voteRepository: VoteRepository) {}

  async execute({ productId }: { productId: string }) {
    return this.voteRepository.upsertByTargetId(productId, vote => {
      vote.upvote();

      return vote;
    });
  }
}
