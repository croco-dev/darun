import { ProductDescriptionJobService } from '@darun/products-service';
import { AuthRole } from '@darun/utils-apollo-server';
import { Arg, Authorized, Mutation, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { ProductDescriptionJob } from './graphs/ProductDescriptionJob';

@Resolver()
@Service()
export class ProductDescriptionMutationResolver {
  constructor(private readonly productDescriptionJobService: ProductDescriptionJobService) {}

  @Authorized([AuthRole.Admin])
  @Mutation(() => ProductDescriptionJob)
  async retryProductDescriptionJob(
    @Arg('id') id: string,
    @Arg('requestId', () => String, { nullable: true })
    requestId?: string | null
  ): Promise<ProductDescriptionJob> {
    const job = await this.productDescriptionJobService.retryProductDescriptionJob(id, requestId);

    return {
      id: job.id,
      productId: job.productId,
      status: job.status,
      dispatchStatus: job.dispatchStatus,
      runNotBefore: job.runNotBefore,
      nextDispatchAt: job.nextDispatchAt,
      retryOfJobId: job.retryOfJobId ?? undefined,
      message: job.message ?? undefined,
      error: job.error ?? undefined,
      candidateHtml: job.candidateHtml ?? undefined,
      appliedAt: job.appliedAt ?? undefined,
      writerModel: job.writerModel ?? undefined,
      reviewerModel: job.reviewerModel ?? undefined,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}
