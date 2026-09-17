import { ProductDescriptionJobService, type ProductDescriptionJobStatus } from '@darun/products-service';
import { AuthRole } from '@darun/utils-apollo-server';
import { Arg, Authorized, Int, Query, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { ProductDescriptionJob } from './graphs/ProductDescriptionJob';

@Resolver()
@Service()
export class ProductDescriptionQueryResolver {
  constructor(private readonly productDescriptionJobService: ProductDescriptionJobService) {}

  @Authorized([AuthRole.Admin])
  @Query(() => ProductDescriptionJob, { nullable: true })
  async productDescriptionJob(@Arg('id') id: string): Promise<ProductDescriptionJob | null> {
    const job = await this.productDescriptionJobService.getJob(id);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      productId: job.productId,
      status: job.status,
      message: job.message ?? undefined,
      error: job.error ?? undefined,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  @Authorized([AuthRole.Admin])
  @Query(() => [ProductDescriptionJob])
  async productDescriptionJobs(
    @Arg('status', () => String, { nullable: true }) status?: string,
    @Arg('limit', () => Int, { nullable: true }) limit?: number,
    @Arg('offset', () => Int, { nullable: true }) offset?: number
  ): Promise<ProductDescriptionJob[]> {
    const jobs = await this.productDescriptionJobService.getJobs({
      status: status as ProductDescriptionJobStatus | undefined,
      limit: limit ?? 50,
      offset: offset ?? 0,
    });

    return jobs.map(job => ({
      id: job.id,
      productId: job.productId,
      status: job.status,
      message: job.message ?? undefined,
      error: job.error ?? undefined,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    }));
  }
}
