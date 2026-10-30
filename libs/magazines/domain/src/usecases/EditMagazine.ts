import { Inject, Service } from 'typedi';
import { Magazine } from '../entities/Magazine';
import { magazineInvalidArgs } from '../errors/magazineError';
import type { MagazineRepository } from '../repositories/MagazineRepository';
import { MagazineRepositoryToken } from '../repositories/MagazineRepository';
import { isValidMagazineSlug } from '../slug/isValidMagazineSlug';

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
    if (slug !== undefined && !isValidMagazineSlug(slug)) {
      throw magazineInvalidArgs('상세 주소로 사용할 수 없는 슬러그입니다.');
    }
    return this.magazineRepository.updateById(id, magazine => {
      if (!isValidMagazineSlug(slug ?? magazine.slug)) {
        throw magazineInvalidArgs('상세 주소로 사용할 수 없는 슬러그입니다.');
      }
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
