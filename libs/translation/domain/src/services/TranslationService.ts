import { Inject, Service } from 'typedi';
import type { TranslationRepository } from '../repositories/TranslationRepository';
import { TranslationRepositoryToken } from '../repositories/TranslationRepository';

type TranslationEntry = {
  entityId: string;
  field: string;
  koreanValue: string;
};

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

  async getTranslations(params: {
    entityType: string;
    locale: string;
    entries: TranslationEntry[];
  }): Promise<Map<string, string>> {
    const { entityType, locale, entries } = params;

    if (entries.length === 0) {
      return new Map();
    }

    const fallbackTranslations = new Map(entries.map(entry => [`${entry.entityId}:${entry.field}`, entry.koreanValue]));

    if (locale === 'ko') {
      return fallbackTranslations;
    }

    const translatedRows = await this.translationRepository.findMany({
      entityType,
      locale,
      entities: entries.map(({ entityId, field }) => ({ entityId, field })),
    });

    for (const translatedRow of translatedRows) {
      if (translatedRow.value) {
        fallbackTranslations.set(`${translatedRow.entityId}:${translatedRow.field}`, translatedRow.value);
      }
    }

    return fallbackTranslations;
  }
}
