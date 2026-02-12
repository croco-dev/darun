import { LlmClient } from '@darun/utils-llm';
import { GetMagazine } from '@magazine/domain';
import { GetProduct, Product } from '@products/domain';
import { Inject, Service } from 'typedi';
import { Magazine } from '../../magazine/domain/entities/Magazine';
import { TranslationService } from '../domain/services/TranslationService';

export type TranslationEntityType = 'Product' | 'Magazine';

const TRANSLATABLE_FIELDS: Record<TranslationEntityType, string[]> = {
  Product: ['name', 'summary', 'description'],
  Magazine: ['title', 'summary', 'content'],
};

@Service()
export class TranslationJobService {
  constructor(
    private readonly getProductUseCase: GetProduct,
    private readonly getMagazineUseCase: GetMagazine,
    private readonly translationService: TranslationService,
    @Inject() private readonly llmClient: LlmClient
  ) {}

  async translateEntity(entityType: TranslationEntityType, entityId: string, fields: string[]): Promise<void> {
    const entity = await this.getEntity(entityType, entityId);
    const uniqueFields = this.getUniqueFields(fields);

    for (const field of uniqueFields) {
      const koreanValue = this.getKoreanValue(entityType, entity, field);
      if (!koreanValue) {
        continue;
      }

      const translatedValue = await this.translateKoreanToEnglish(koreanValue);

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

  private async getEntity(entityType: TranslationEntityType, entityId: string): Promise<Product | Magazine> {
    if (entityType === 'Product') {
      const product = await this.getProductUseCase.execute({ id: entityId });
      if (!product) {
        throw new Error('Product가 존재하지 않습니다.');
      }

      return product;
    }

    const magazine = await this.getMagazineUseCase.execute({ id: entityId });
    if (!magazine) {
      throw new Error('Magazine이 존재하지 않습니다.');
    }

    return magazine;
  }

  private getKoreanValue(
    entityType: TranslationEntityType,
    entity: Product | Magazine,
    field: string
  ): string | undefined {
    const translatableFields = TRANSLATABLE_FIELDS[entityType];
    if (!translatableFields.includes(field)) {
      throw new Error(`${entityType}의 번역 가능한 필드가 아닙니다: ${field}`);
    }

    const value = (entity as unknown as Record<string, unknown>)[field];
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmedValue = value.trim();
    return trimmedValue || undefined;
  }

  private async translateKoreanToEnglish(text: string): Promise<string> {
    const response = await this.llmClient.completion('x-ai/grok-4-fast', [
      {
        role: 'user',
        content: `Translate the following Korean text to English: ${text}`,
      },
    ]);

    if (!response.content?.trim()) {
      throw new Error('LLM 번역 응답이 비어 있습니다.');
    }

    return response.content.trim();
  }
}
