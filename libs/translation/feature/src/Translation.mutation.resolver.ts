import { TranslationEntityType, TranslationJobService } from '@darun/translation-service';
import { AuthRole } from '@darun/utils-apollo-server';
import { Arg, Authorized, Mutation, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { TranslationJob } from './graphs/TranslationJob';

const SUPPORTED_ENTITY_TYPES: TranslationEntityType[] = ['Product', 'Magazine', 'ProductFeature'];

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

    const job = await this.translationJobService.requestTranslationJob(
      normalizedEntityType,
      entityId,
      normalizedFields
    );
    return {
      ...job,
      fields: job.fields ?? normalizedFields,
      message: job.message ?? undefined,
      error: job.error ?? undefined,
      model: job.model ?? undefined,
      retryOfJobId: job.retryOfJobId ?? undefined,
    };
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => TranslationJob)
  async requestProductTranslation(
    @Arg('productId', () => String, { nullable: true }) productId?: string,
    @Arg('slug', () => String, { nullable: true }) slug?: string
  ): Promise<TranslationJob> {
    if (!productId && !slug) {
      throw new Error('productId 또는 slug가 필요합니다.');
    }

    const job = await this.translationJobService.requestProductTranslationJob(
      productId ? { id: productId } : { slug: slug! }
    );

    return {
      id: job.id,
      entityType: 'Product',
      entityId: job.entityId,
      fields: ['name', 'summary', 'description', 'features'],
      locale: 'en',
      status: job.status,
      dispatchStatus: job.dispatchStatus,
      runNotBefore: job.runNotBefore,
      nextDispatchAt: job.nextDispatchAt,
      retryOfJobId: job.retryOfJobId ?? undefined,
      message: job.message ?? undefined,
    };
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => TranslationJob)
  async retryTranslationJob(@Arg('id', () => String) id: string): Promise<TranslationJob> {
    const job = await this.translationJobService.retryProductTranslationJob(id);

    return {
      id: job.id,
      entityType: job.entityType,
      entityId: job.entityId,
      fields: job.fields ?? ['name', 'summary', 'description', 'features'],
      locale: job.locale,
      status: job.status,
      dispatchStatus: job.dispatchStatus,
      runNotBefore: job.runNotBefore,
      nextDispatchAt: job.nextDispatchAt,
      retryOfJobId: job.retryOfJobId ?? undefined,
      model: job.model ?? undefined,
      message: job.message ?? undefined,
      error: job.error ?? undefined,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
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
