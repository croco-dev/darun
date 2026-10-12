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
    // 같은 값 no-op은 provenance를 유지한다. 다른 값인데 새 provenance가
    // 없으면 구 해시를 물려받지 않고 명시적으로 거부한다.
    if (params.sourceHash === undefined || params.sourceHash === null) {
      const existing = await this.translationRepository.findOne({
        entityType: params.entityType,
        entityId: params.entityId,
        locale: params.locale,
        field: params.field,
      });
      if (existing && existing.value !== params.value) {
        throw new Error(
          `sourceHash 없이 번역 값을 변경할 수 없습니다: ${params.entityType}/${params.entityId}/${params.locale}/${params.field}`
        );
      }
      if (existing && existing.value === params.value) {
        // 같은 값 no-op: 명시적 null provenance가 저장된 해시를 지우지 않도록
        // 키를 제거해 저장소가 기존 값을 유지하게 한다. 신규 행의 null은 그대로 둔다.
        const cleaned = { ...params };
        if (cleaned.sourceHash === undefined || cleaned.sourceHash === null) {
          delete cleaned.sourceHash;
        }
        if (cleaned.model === undefined || cleaned.model === null) {
          delete cleaned.model;
        }
        if (cleaned.promptVersion === undefined || cleaned.promptVersion === null) {
          delete cleaned.promptVersion;
        }
        await this.translationRepository.upsert(cleaned);
        return;
      }
    }
    await this.translationRepository.upsert(params);
  }

  async upsertTranslations(paramsList: UpsertTranslationParams[]): Promise<void> {
    if (paramsList.length === 0) {
      return;
    }
    // 배치도 같은 규칙을 적용한다. 구 해시 상속은 어떤 경로에서도 허용하지 않는다.
    const missingProvenance = paramsList.filter(p => p.sourceHash === undefined || p.sourceHash === null);
    if (missingProvenance.length > 0) {
      // 조회 키에 entityType·locale을 함께 넣어 서로 다른 엔티티·로케일간의
      // 우연한 키 충돌을 방지한다.
      const keyOf = (p: { entityType: string; entityId: string; locale: string; field: string }) =>
        `${p.entityType}␟${p.locale}␟${p.entityId}:${p.field}`;
      const groups = new Map<string, { entityType: string; locale: string; keys: string[] }>();
      for (const params of missingProvenance) {
        const groupKey = `${params.entityType}␟${params.locale}`;
        const group = groups.get(groupKey) ?? { entityType: params.entityType, locale: params.locale, keys: [] };
        group.keys.push(keyOf(params));
        groups.set(groupKey, group);
      }
      for (const group of groups.values()) {
        const existingRows = await this.translationRepository.findMany({
          entityType: group.entityType,
          locale: group.locale,
          entities: missingProvenance
            .filter(p => p.entityType === group.entityType && p.locale === group.locale)
            .map(p => ({ entityId: p.entityId, field: p.field })),
        });
        const existingByKey = new Map(existingRows.map(row => [keyOf(row), row]));
        const wanted = new Map(missingProvenance.filter(p => p.entityType === group.entityType && p.locale === group.locale).map(p => [keyOf(p), p]));
        for (const key of group.keys) {
          const params = wanted.get(key);
          const existing = existingByKey.get(key);
          if (params && existing && existing.value !== params.value) {
            throw new Error(
              `sourceHash 없이 번역 값을 변경할 수 없습니다: ${params.entityType}/${params.entityId}/${params.locale}/${params.field}`
            );
          }
          // 같은 값 no-op: provenance 키의 명시적 null이 저장된 해시를 지우지 않도록 제거한다.
          if (params && existing && existing.value === params.value) {
            if (params.sourceHash === undefined || params.sourceHash === null) {
              delete params.sourceHash;
            }
            if (params.model === undefined || params.model === null) {
              delete params.model;
            }
            if (params.promptVersion === undefined || params.promptVersion === null) {
              delete params.promptVersion;
            }
          }
        }
      }
    }
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
