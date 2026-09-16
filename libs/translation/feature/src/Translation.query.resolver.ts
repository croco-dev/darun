import { TranslationJobService } from '@darun/translation-service';
import { AuthRole } from '@darun/utils-apollo-server';
import { Arg, Authorized, Query, Resolver } from 'type-graphql';
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
    };
  }
}
