import { Inject, Service } from "typedi";
import { Magazine } from "../entities/Magazine";
import type { MagazineRepository } from "../repositories/MagazineRepository";
import { MagazineRepositoryToken } from "../repositories/MagazineRepository";

@Service()
export class PublishMagazine {
  constructor(
    @Inject(MagazineRepositoryToken)
    private readonly magazineRepository: MagazineRepository,
  ) {}

  async execute({ id }: { id: string }): Promise<Magazine> {
    return this.magazineRepository.updateById(id, (magazine) => {
      magazine.publish();
      return magazine;
    });
  }
}
