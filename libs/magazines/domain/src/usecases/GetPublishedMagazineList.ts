import { Inject, Service } from 'typedi';
import type { MagazineRepository } from '../repositories/MagazineRepository';
import { MagazineRepositoryToken } from '../repositories/MagazineRepository';
import {
  validatePublishedMagazinePage,
  type PublishedMagazineCursor,
  type PublishedMagazinePage,
} from '../repositories/PublishedMagazinePage';

@Service()
export class GetPublishedMagazineList {
  constructor(
    @Inject(MagazineRepositoryToken)
    private readonly magazineRepository: MagazineRepository
  ) {}

  async execute({
    first = 24,
    after,
  }: {
    first?: number;
    after?: PublishedMagazineCursor;
  } = {}): Promise<PublishedMagazinePage> {
    validatePublishedMagazinePage(first, after);
    return this.magazineRepository.findPublishedPage(first, after);
  }
}
