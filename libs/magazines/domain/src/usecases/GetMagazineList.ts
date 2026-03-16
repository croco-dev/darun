import { Inject, Service } from 'typedi';
import type { Magazine } from '../entities/Magazine';
import type { MagazineRepository } from '../repositories/MagazineRepository';
import { MagazineRepositoryToken } from '../repositories/MagazineRepository';

@Service()
export class GetMagazineList {
  constructor(
    @Inject(MagazineRepositoryToken)
    private readonly magazineRepository: MagazineRepository,
  ) {}

  async execute({
    page,
    limit = 50,
  }: {
    page: number;
    limit: number;
  }): Promise<{ data: Magazine[]; total: number }> {
    return this.magazineRepository.findAllWithPagination(page, limit);
  }
}
