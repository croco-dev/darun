// eslint-disable-next-line boundaries/element-types
import type { VoteRepository } from "@darun/voting-domain";
import { VoteRepositoryToken } from "@darun/voting-domain";
import { Inject, Service } from "typedi";
import type { ProductRepository } from "../repositories/ProductRepository";
import { ProductRepositoryToken } from "../repositories/ProductRepository";

@Service()
export class GetRankedProducts {
  constructor(
    @Inject(VoteRepositoryToken)
    private readonly voteRepository: VoteRepository,
    @Inject(ProductRepositoryToken)
    private readonly productRepository: ProductRepository,
  ) {}

  async execute({ limit }: { limit: number }) {
    const votes = await this.voteRepository.findTopNByVoteCount(limit);

    const products = await Promise.all(
      votes.map((vote) =>
        this.productRepository.findPublishedOneById(vote.targetId),
      ),
    );

    return products.filter((product) => product !== null);
  }
}
