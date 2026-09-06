import { Inject, Service } from 'typedi';
import { Magazine } from '../entities/Magazine';
import type { MagazineRepository } from '../repositories/MagazineRepository';
import { MagazineRepositoryToken } from '../repositories/MagazineRepository';

@Service()
export class GetPublishedMagazineList {
  constructor(
    @Inject(MagazineRepositoryToken)
    private readonly magazineRepository: MagazineRepository
  ) {}

  async execute(): Promise<Magazine[]> {
    return this.magazineRepository.findAllPublished();
  }
}
