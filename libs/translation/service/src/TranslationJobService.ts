import { GetMagazine, Magazine } from '@darun/magazines-domain';
import { GetProduct, GetProductFeature, GetProductFeatures, Product, ProductFeature } from '@darun/products-domain';
import { TranslationService } from '@darun/translation-domain';
import { LlmClient, withRetry } from '@darun/utils-llm';
import { Inject, Service } from 'typedi';

export type TranslationEntityType = 'Product' | 'Magazine' | 'ProductFeature';

type TranslatableFieldMetadata = {
  property: string;
};

export const TRANSLATABLE_FIELD_METADATA: Record<
  TranslationEntityType,
  { fields: Record<string, TranslatableFieldMetadata> }
> = {
  Product: {
    fields: {
      name: { property: 'name' },
      summary: { property: 'summary' },
      description: { property: 'description' },
    },
  },
  Magazine: {
    fields: {
      title: { property: 'title' },
      summary: { property: 'summary' },
      content: { property: 'content' },
    },
  },
  ProductFeature: {
    fields: {
      name: { property: 'name' },
      summary: { property: 'summary' },
    },
  },
};

const TRANSLATION_SYSTEM_PROMPT = `당신은 글로벌 IT 서비스 및 SaaS 전문 테크 에디터이자 전문 번역가입니다.
한국어로 작성된 제품 및 서비스 정보를 자연스럽고 직관적인 영문으로 번역합니다.

핵심 원칙:
1. 전문 테크 제품 톤앤매너: Product Hunt, G2 등에서 통용되는 명확하고 세련되며 간결한 B2B/B2C 프로덕트 카피라이팅 스타일을 유지합니다.
2. HTML 구조 및 마크업 엄격 보존:
   - 입력에 HTML 태그(p, h2, h3, ul, li, strong, em, br, a 등)가 포함된 경우 모든 태그와 구조를 100% 그대로 유지하고 내부 텍스트만 번역합니다.
   - 새로운 태그나 속성을 임의로 추가하거나 삭제하지 마십시오.
3. 고유명사 및 브랜드명 원칙:
   - 잘 알려진 글로벌/국내 테크 서비스명 및 브랜드는 공식 영문 표기를 사용합니다 (예: "슬랙" -> "Slack", "노션" -> "Notion", "피그마" -> "Figma", "카카오톡" -> "KakaoTalk", "토스" -> "Toss").
   - 공식 영문명이 없는 한국어 제품명은 가장 자연스럽고 널리 통용되는 로마자 표기를 적용합니다.
4. 과장 표현 지양 및 직관적 전달: 불필요한 미사여구는 줄이고 핵심 기능과 가치를 직관적으로 전달합니다.`;

function parseJsonFromLlmResponse(raw: string): unknown {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const target = jsonMatch ? jsonMatch[1].trim() : trimmed;
  return JSON.parse(target);
}

@Service()
export class TranslationJobService {
  constructor(
    private readonly getProductUseCase: GetProduct,
    private readonly getMagazineUseCase: GetMagazine,
    private readonly translationService: TranslationService,
    @Inject(() => LlmClient) private readonly llmClient: LlmClient,
    private readonly getProductFeatureUseCase?: GetProductFeature,
    private readonly getProductFeaturesUseCase?: GetProductFeatures
  ) {}

  async translateProductWithFeatures(identifier: { id?: string; slug?: string } | string): Promise<string> {
    const query = typeof identifier === 'string' ? { id: identifier } : identifier;
    const product = await this.getProductUseCase.execute(query);
    if (!product) {
      throw new Error('Product가 존재하지 않습니다.');
    }

    const productId = product.id;

    let features: ProductFeature[] = [];
    if (this.getProductFeaturesUseCase) {
      try {
        features = await this.getProductFeaturesUseCase.execute({ productId });
      } catch (error) {
        console.warn(`Failed to fetch features for product ${productId}:`, error);
      }
    }

    try {
      const inputPayload = {
        name: product.name,
        summary: product.summary,
        description: product.description || '',
        features: features.map(feature => ({
          id: feature.id,
          name: feature.name,
          summary: feature.summary || '',
        })),
      };

      const prompt = [
        '다음 제품 정보와 주요 기능 목록을 영어로 번역해주세요.',
        '반드시 아래와 같은 JSON 형식으로만 응답하고, 마크다운 코드블록이나 다른 설명은 일절 포함하지 마세요.',
        '',
        'JSON 응답 포맷:',
        '{',
        '  "name": "영문 제품명",',
        '  "summary": "영문 한 줄 요약",',
        '  "description": "영문 본문 설명 (HTML 태그 보존)",',
        '  "features": [',
        '    { "id": "기능ID", "name": "영문 기능명", "summary": "영문 기능 설명" }',
        '  ]',
        '}',
        '',
        '번역할 원본 데이터 (JSON):',
        JSON.stringify(inputPayload, null, 2),
      ].join('\n');

      const response = await withRetry(
        () =>
          this.withTimeout(
            this.llmClient.completion([
              { role: 'system', content: TRANSLATION_SYSTEM_PROMPT },
              { role: 'user', content: prompt },
            ]),
            35_000,
            'LLM 통합 번역 요청이 시간 초과되었습니다.'
          ),
        { maxRetries: 2, baseDelay: 1000, maxDelay: 20000 }
      );

      const parsed = parseJsonFromLlmResponse(response.content || '') as {
        name?: string;
        summary?: string;
        description?: string;
        features?: Array<{ id: string; name?: string; summary?: string }>;
      };

      if (parsed.name) {
        await this.translationService.upsertTranslation({
          entityType: 'Product',
          entityId: productId,
          locale: 'en',
          field: 'name',
          value: parsed.name.trim(),
        });
      }

      if (parsed.summary) {
        await this.translationService.upsertTranslation({
          entityType: 'Product',
          entityId: productId,
          locale: 'en',
          field: 'summary',
          value: parsed.summary.trim(),
        });
      }

      if (parsed.description) {
        await this.translationService.upsertTranslation({
          entityType: 'Product',
          entityId: productId,
          locale: 'en',
          field: 'description',
          value: parsed.description.trim(),
        });
      }

      if (Array.isArray(parsed.features)) {
        for (const featureItem of parsed.features) {
          if (!featureItem.id) continue;
          if (featureItem.name) {
            await this.translationService.upsertTranslation({
              entityType: 'ProductFeature',
              entityId: featureItem.id,
              locale: 'en',
              field: 'name',
              value: featureItem.name.trim(),
            });
          }
          if (featureItem.summary) {
            await this.translationService.upsertTranslation({
              entityType: 'ProductFeature',
              entityId: featureItem.id,
              locale: 'en',
              field: 'summary',
              value: featureItem.summary.trim(),
            });
          }
        }
      }
    } catch (error) {
      console.warn('Single-turn contextual translation failed, falling back to individual fields:', error);
      await this.translateEntity('Product', productId, ['name', 'summary', 'description']);
      for (const feature of features) {
        await this.translateEntity('ProductFeature', feature.id, ['name', 'summary']);
      }
    }

    return productId;
  }

  async translateEntity(entityType: TranslationEntityType, entityId: string, fields: string[]): Promise<void> {
    const entity = await this.getEntity(entityType, entityId);
    const uniqueFields = this.getUniqueFields(fields);

    for (const field of uniqueFields) {
      const koreanValue = this.getKoreanValue(entityType, entity, field);
      if (!koreanValue) {
        continue;
      }

      const isHtml = field === 'description' || field === 'content';
      const translatedValue = await this.translateKoreanToEnglish(koreanValue, isHtml);

      await this.translationService.upsertTranslation({
        entityType,
        entityId,
        locale: 'en',
        field,
        value: translatedValue,
      });
    }
  }

  private getUniqueFields(fields: string[]): string[] {
    return [...new Set(fields.map(field => field.trim()).filter(Boolean))];
  }

  private async getEntity(
    entityType: TranslationEntityType,
    entityId: string
  ): Promise<Product | Magazine | ProductFeature> {
    if (entityType === 'Product') {
      const product = await this.getProductUseCase.execute({ id: entityId });
      if (!product) {
        throw new Error('Product가 존재하지 않습니다.');
      }

      return product;
    }

    if (entityType === 'Magazine') {
      const magazine = await this.getMagazineUseCase.execute({ id: entityId });
      if (!magazine) {
        throw new Error('Magazine이 존재하지 않습니다.');
      }

      return magazine;
    }

    if (entityType === 'ProductFeature') {
      if (!this.getProductFeatureUseCase) {
        throw new Error('GetProductFeature usecase가 주입되지 않았습니다.');
      }
      const feature = await this.getProductFeatureUseCase.execute({
        id: entityId,
      });
      if (!feature) {
        throw new Error('ProductFeature가 존재하지 않습니다.');
      }

      return feature;
    }

    throw new Error(`지원하지 않는 엔티티 타입입니다: ${entityType}`);
  }

  private getKoreanValue(
    entityType: TranslationEntityType,
    entity: Product | Magazine | ProductFeature,
    field: string
  ): string | undefined {
    const fieldMetadata = TRANSLATABLE_FIELD_METADATA[entityType]?.fields[field];
    if (!fieldMetadata) {
      throw new Error(`${entityType}의 번역 가능한 필드가 아닙니다: ${field}`);
    }

    const value = (entity as unknown as Record<string, unknown>)[fieldMetadata.property];
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmedValue = value.trim();
    return trimmedValue || undefined;
  }

  private async translateKoreanToEnglish(text: string, isHtml: boolean = false): Promise<string> {
    try {
      const response = await withRetry(
        () =>
          this.withTimeout(
            this.llmClient.completion([
              { role: 'system', content: TRANSLATION_SYSTEM_PROMPT },
              {
                role: 'user',
                content: isHtml
                  ? `Translate the following Korean HTML text to English, preserving all HTML tags: ${text}`
                  : `Translate the following Korean text to English: ${text}`,
              },
            ]),
            25_000,
            'LLM 번역 요청이 시간 초과되었습니다. 잠시 후 다시 시도해주세요.'
          ),
        { maxRetries: 3, baseDelay: 1000, maxDelay: 30000 }
      );

      const content = response.content?.trim();
      if (!content) {
        throw new Error('LLM 번역 응답이 비어 있습니다.');
      }

      return content;
    } catch (error) {
      if (error instanceof Error && error.message.includes('시간 초과')) {
        throw error;
      }
      throw new Error(`번역 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error(message)), ms));
    return Promise.race([promise, timeout]);
  }
}
