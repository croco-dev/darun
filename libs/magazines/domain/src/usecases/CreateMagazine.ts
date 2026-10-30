import { Inject, Service } from 'typedi';
import { Magazine } from '../entities/Magazine';
import { magazineCreateFailed, magazineInvalidArgs } from '../errors/magazineError';
import type { MagazineRepository } from '../repositories/MagazineRepository';
import { MagazineRepositoryToken } from '../repositories/MagazineRepository';
import { isValidMagazineSlug } from '../slug/isValidMagazineSlug';

@Service()
export class CreateMagazine {
  constructor(
    @Inject(MagazineRepositoryToken)
    private readonly magazineRepository: MagazineRepository
  ) {}

  async execute({
    title,
    slug,
    summary,
    content,
    backgroundImageUrl,
    logoImageUrl,
    authorId,
  }: {
    title: string;
    slug?: string;
    summary?: string;
    content?: string;
    backgroundImageUrl: string;
    logoImageUrl?: string;
    authorId: string;
  }) {
    const magazine = new Magazine({
      title,
      slug,
      summary,
      content,
      backgroundImageUrl,
      logoImageUrl,
      authorId,
    });

    if (!isValidMagazineSlug(magazine.slug)) {
      throw magazineInvalidArgs('상세 주소로 사용할 수 없는 슬러그입니다.');
    }

    const inserted = await this.magazineRepository.insert(magazine);

    if (!inserted) {
      throw magazineCreateFailed();
    }

    return inserted;
  }
}
