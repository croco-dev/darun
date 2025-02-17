import { Inject, Service } from 'typedi';
import { Magazine } from '../entities/Magazine';
import { magazineCreateFailed } from '../errors/magazineError';
import { MagazineRepository, MagazineRepositoryToken } from '../repositories/MagazineRepository';

@Service()
export class CreateMagazine {
  constructor(@Inject(MagazineRepositoryToken) private readonly magazineRepository: MagazineRepository) {}

  async execute({
    title,
    slug,
    description,
    backgroundImageUrl,
  }: {
    title: string;
    slug?: string;
    description?: string;
    backgroundImageUrl: string;
  }) {
    const magazine = new Magazine({ title, slug, description, backgroundImageUrl });

    const inserted = await this.magazineRepository.insert(magazine);

    if (!inserted) {
      throw magazineCreateFailed();
    }

    return inserted;
  }
}
