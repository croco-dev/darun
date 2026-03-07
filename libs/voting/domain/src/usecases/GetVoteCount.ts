import { Inject, Service } from 'typedi';

import { VoteRepository, VoteRepositoryToken } from '../repositories/VoteRepository';

@Service()
export class GetVoteCount {
  constructor(@Inject(VoteRepositoryToken) private voteRepository: VoteRepository) {}

  async execute({ productId }: { productId: string }) {
    return this.voteRepository.findByTargetId(productId).then(vote => vote?.count ?? 0);
  }
}
