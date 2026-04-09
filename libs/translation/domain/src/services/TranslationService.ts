import { Inject, Service } from 'typedi';
import type { TranslationRepository } from '../repositories/TranslationRepository';
import { TranslationRepositoryToken } from '../repositories/TranslationRepository';

@Service()
export class TranslationService {
  constructor(
    @Inject(TranslationRepositoryToken)
    private readonly translationRepository: TranslationRepository
  ) {}

  async upsertTranslation(params: {
    entityType: string;
    entityId: string;
    locale: string;
    field: string;
    value: string;
  }): Promise<void> {
    await this.translationRepository.upsert(params);
  }

  async getTranslation(params: {
    entityType: string;
    entityId: string;
    locale: string;
    field: string;
    koreanValue: string;
  }): Promise<string> {
    const { entityType, entityId, locale, field, koreanValue } = params;

    if (locale === 'ko') {
      return koreanValue;
    }

    const translated = await this.translationRepository.findOne({
      entityType,
      entityId,
      locale,
      field,
    });

    if (translated?.value) {
      return translated.value;
    }

    return koreanValue;
  }
}
