import { AuthRole } from '@darun/utils-apollo-server';
import { Arg, Authorized, Mutation, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { TranslationJob } from './graphs/TranslationJob';
import type { TranslationEntityType, TranslationJobService } from './TranslationJobService';

const SUPPORTED_ENTITY_TYPES: TranslationEntityType[] = ['Product', 'Magazine'];

@Resolver()
@Service()
export class TranslationMutationResolver {
  constructor(private readonly translationJobService: TranslationJobService) {}

  @Authorized([AuthRole.Admin])
  @Mutation(() => TranslationJob)
  async requestTranslation(
    @Arg('entityType') entityType: string,
    @Arg('entityId') entityId: string,
    @Arg('fields', () => [String]) fields: string[]
  ): Promise<TranslationJob> {
    const normalizedEntityType = this.validateEntityType(entityType);
    const normalizedFields = this.validateFields(fields);

    await this.translationJobService.translateEntity(normalizedEntityType, entityId, normalizedFields);

    return {
      entityType: normalizedEntityType,
      entityId,
      fields: normalizedFields,
      locale: 'en',
      status: 'completed',
      message: '번역이 완료되었습니다.',
    };
  }

  private validateEntityType(entityType: string): TranslationEntityType {
    if (SUPPORTED_ENTITY_TYPES.includes(entityType as TranslationEntityType)) {
      return entityType as TranslationEntityType;
    }

    throw new Error(`지원하지 않는 entityType입니다. (${SUPPORTED_ENTITY_TYPES.join(', ')})`);
  }

  private validateFields(fields: string[]): string[] {
    const normalizedFields = [...new Set(fields.map(field => field.trim()).filter(Boolean))];
    if (!normalizedFields.length) {
      throw new Error('fields는 최소 1개 이상 필요합니다.');
    }

    return normalizedFields;
  }
}
