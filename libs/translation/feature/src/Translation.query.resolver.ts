import { TranslationJobService, TranslationJobStatus } from '@darun/translation-service';
import { AuthRole } from '@darun/utils-apollo-server';
import { Arg, Authorized, Int, Query, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { TranslationJob } from './graphs/TranslationJob';

@Resolver()
@Service()
export class TranslationQueryResolver {
  constructor(private readonly translationJobService: TranslationJobService) {}

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
      locale: job.locale,
      status: job.status,
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
      locale: job.locale,
      status: job.status,
      message: job.message ?? undefined,
      error: job.error ?? undefined,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    }));
  }
}
