import {
  computeSourceHash,
  TranslationRepositoryToken,
  TranslationSourceStoreToken,
  type TranslationRepository,
  type TranslationSourceStore,
  type TranslationEntityType,
} from '@darun/translation-domain';
import { TranslationJobService, TranslationJobStatus } from '@darun/translation-service';
import { AuthRole } from '@darun/utils-apollo-server';
import { Arg, Authorized, Int, Query, Resolver } from 'type-graphql';
import { Inject, Service } from 'typedi';
import { TranslationFreshness } from './graphs/TranslationFreshness';
import { TranslationJob } from './graphs/TranslationJob';

@Resolver()
@Service()
export class TranslationQueryResolver {
  constructor(
    private readonly translationJobService: TranslationJobService,
    @Inject(TranslationRepositoryToken) private readonly translations: TranslationRepository,
    @Inject(TranslationSourceStoreToken) private readonly sources: TranslationSourceStore
  ) {}

  @Authorized([AuthRole.Admin])
  @Query(() => [TranslationFreshness], {
    description:
      '관리자만 조회할 수 있다. 요청한 Product/Magazine/ProductFeature 필드의 현재 서버 원문과 저장된 영어 provenance를 비교하며 번역 작업을 생성하지 않는다.',
  })
  async translationFreshness(
    @Arg('entityType') entityType: string,
    @Arg('entityId') entityId: string,
    @Arg('fields', () => [String]) fields: string[]
  ): Promise<TranslationFreshness[]> {
    if (entityType !== 'Product' && entityType !== 'ProductFeature' && entityType !== 'Magazine')
      throw new Error('지원하지 않는 번역 entityType입니다.');
    const snapshot = await this.sources.read({ entityType: entityType as TranslationEntityType, entityId, fields });
    return Promise.all(
      snapshot.values.map(async source => {
        if (!source.value.trim() && source.field !== 'name' && source.field !== 'title')
          return { entityType: source.entityType, entityId: source.entityId, field: source.field, status: 'current' };
        const row = await this.translations.findOne({
          entityType: source.entityType,
          entityId: source.entityId,
          field: source.field,
          locale: 'en',
        });
        return {
          entityType: source.entityType,
          entityId: source.entityId,
          field: source.field,
          status: !row ? 'missing' : row.sourceHash === computeSourceHash(source.value) ? 'current' : 'stale',
        };
      })
    );
  }

  @Authorized([AuthRole.Admin])
  @Query(() => TranslationJob, { nullable: true })
  async translationJob(@Arg('id') id: string): Promise<TranslationJob | null> {
    const job = await this.translationJobService.getJob(id);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      entityType: job.entityType,
      entityId: job.entityId,
      fields: job.fields ?? (job.entityType === 'Product' ? ['name', 'summary', 'description', 'features'] : []),
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

  @Authorized([AuthRole.Admin])
  @Query(() => [TranslationJob])
  async translationJobs(
    @Arg('status', () => String, { nullable: true }) status?: string,
    @Arg('limit', () => Int, { nullable: true }) limit?: number,
    @Arg('offset', () => Int, { nullable: true }) offset?: number
  ): Promise<TranslationJob[]> {
    const jobs = await this.translationJobService.getJobs({
      status: status as TranslationJobStatus | undefined,
      limit: limit ?? 50,
      offset: offset ?? 0,
    });

    return jobs.map(job => ({
      id: job.id,
      entityType: job.entityType,
      entityId: job.entityId,
      fields: job.fields ?? (job.entityType === 'Product' ? ['name', 'summary', 'description', 'features'] : []),
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
    }));
  }
}
