import { Inject, Service } from "typedi";
import type { AlternativeProductRepository } from "../repositories/AlternativeProductRepository";
import { AlternativeProductRepositoryToken } from "../repositories/AlternativeProductRepository";

@Service()
export class GetAlternativeProducts {
  constructor(
    @Inject(AlternativeProductRepositoryToken)
    private readonly alternativeProductRepository: AlternativeProductRepository,
  ) {}

  async execute({ productId }: { productId: string }) {
    return this.alternativeProductRepository.findManyByProductId(productId);
  }
}
