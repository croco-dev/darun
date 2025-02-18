import { MagazineRepository, MagazineRepositoryToken } from '@magazine/domain';
import { Inject, Service } from 'typedi';

@Service()
export class GetMagazine {
  constructor(@Inject(MagazineRepositoryToken) private readonly magazineRepository: MagazineRepository) {}

  async execute({ id, slug }: { id?: string; slug?: string }) {
    if (slug) {
      return this.magazineRepository.findOneBySlug(slug);
    }

    if (!id) {
      throw new Error('id or slug is required to get a product.');
    }
    return this.magazineRepository.findOneById(id);
  }
}
