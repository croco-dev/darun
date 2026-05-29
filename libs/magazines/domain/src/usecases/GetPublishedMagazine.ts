import { Inject, Service } from "typedi";
import type { MagazineRepository } from "../repositories/MagazineRepository";
import { MagazineRepositoryToken } from "../repositories/MagazineRepository";
import { magazineInvalidArgs } from "../errors/magazineError";

@Service()
export class GetPublishedMagazine {
  constructor(
    @Inject(MagazineRepositoryToken)
    private readonly magazineRepository: MagazineRepository,
  ) {}

  async execute({ id, slug }: { id?: string; slug?: string }) {
    if (slug) {
      return this.magazineRepository.findPublishedOneBySlug(slug);
    }

    if (!id) {
      throw magazineInvalidArgs("id or slug is required to get a magazine.");
    }
    return this.magazineRepository.findPublishedOneById(id);
  }
}
