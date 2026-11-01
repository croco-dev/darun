import { Inject, Service } from 'typedi';
import { Magazine } from '../entities/Magazine';
import { magazineInvalidArgs } from '../errors/magazineError';
import type { MagazineRepository } from '../repositories/MagazineRepository';
import { MagazineRepositoryToken } from '../repositories/MagazineRepository';

@Service()
export class GetMagazineList {
  constructor(
    @Inject(MagazineRepositoryToken)
    private readonly magazineRepository: MagazineRepository
  ) {}

  async execute({ page, limit = 50 }: { page: number; limit?: number }): Promise<{ data: Magazine[]; total: number }> {
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      !Number.isSafeInteger((page - 1) * limit)
    ) {
      throw magazineInvalidArgs();
    }
    return this.magazineRepository.findAllWithPagination(page, limit);
  }
}
