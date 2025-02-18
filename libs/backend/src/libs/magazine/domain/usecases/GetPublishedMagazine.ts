import { Inject, Service } from 'typedi';
import { MagazineRepository, MagazineRepositoryToken } from '../repositories/MagazineRepository';

@Service()
export class GetPublishedMagazine {
  constructor(@Inject(MagazineRepositoryToken) private readonly magazineRepository: MagazineRepository) {}

  async execute({ id, slug }: { id?: string; slug?: string }) {
    if (slug) {
      return this.magazineRepository.findPublishedOneBySlug(slug);
    }

    if (!id) {
      throw new Error('id or slug is required to get a product.');
    }
    return this.magazineRepository.findPublishedOneById(id);
  }
}
