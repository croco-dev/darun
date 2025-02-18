import { Magazine, MagazineRepository, MagazineRepositoryToken } from '@magazine/domain';
import { Inject, Service } from 'typedi';

@Service()
export class GetMagazineList {
  constructor(@Inject(MagazineRepositoryToken) private readonly magazineRepository: MagazineRepository) {}

  async execute({ page, limit = 50 }: { page: number; limit: number }): Promise<{ data: Magazine[]; total: number }> {
    return this.magazineRepository.findAllWithPagination(page, limit);
  }
}
