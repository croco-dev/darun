import { Inject, Service } from 'typedi';
import { Magazine } from '../entities/Magazine';
import { MagazineRepository } from '../repositories/MagazineRepository';
import { MagazineRepositoryToken } from '../repositories/MagazineRepository';

@Service()
export class EditMagazine {
  constructor(
    @Inject(MagazineRepositoryToken)
    private readonly magazineRepository: MagazineRepository
  ) {}

  async execute({
    id,
    slug,
    title,
    summary,
    content,
    backgroundImageUrl,
    logoImageUrl,
  }: {
    id: string;
    slug?: string;
    title?: string;
    summary?: string;
    content?: string;
    backgroundImageUrl?: string;
    logoImageUrl?: string;
  }): Promise<Magazine> {
    return this.magazineRepository.updateById(id, magazine => {
      magazine.update({
        slug,
        title,
        summary,
        content,
        backgroundImageUrl,
        logoImageUrl,
      });

      return magazine;
    });
  }
}
