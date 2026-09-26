import { Inject, Service } from 'typedi';
import type { TranslationRepository, UpsertTranslationParams } from '../repositories/TranslationRepository';
import { TranslationRepositoryToken } from '../repositories/TranslationRepository';
import { computeSourceHash } from '../utils/sourceHash';

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

  async upsertTranslation(params: UpsertTranslationParams): Promise<void> {
    await this.translationRepository.upsert(params);
  }

  async upsertTranslations(paramsList: UpsertTranslationParams[]): Promise<void> {
    await this.translationRepository.upsertMany(paramsList);
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

    try {
      const translated = await this.translationRepository.findOne({
        entityType,
        entityId,
        locale,
        field,
      });

      if (translated?.value) {
        const expectedHash = computeSourceHash(koreanValue);
        if (translated.sourceHash && translated.sourceHash === expectedHash) {
          return translated.value;
        }
      }
    } catch (error) {
      console.error('Failed to fetch translation, falling back to default value:', error);
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

    try {
      const translatedRows = await this.translationRepository.findMany({
        entityType,
        locale,
        entities: entries.map(({ entityId, field }) => ({ entityId, field })),
      });

      const entryMap = new Map(entries.map(e => [`${e.entityId}:${e.field}`, e]));

      for (const translatedRow of translatedRows) {
        const key = `${translatedRow.entityId}:${translatedRow.field}`;
        const entry = entryMap.get(key);
        if (!entry) continue;

        const expectedHash = computeSourceHash(entry.koreanValue);
        if (translatedRow.value && translatedRow.sourceHash && translatedRow.sourceHash === expectedHash) {
          fallbackTranslations.set(key, translatedRow.value);
        }
      }
    } catch (error) {
      console.error('Failed to fetch translations, falling back to default values:', error);
    }

    return fallbackTranslations;
  }
}
