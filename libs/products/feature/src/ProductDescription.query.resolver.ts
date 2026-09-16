import { ProductDescriptionJobService } from '@darun/products-service';
import { AuthRole } from '@darun/utils-apollo-server';
import { Arg, Authorized, Query, Resolver } from 'type-graphql';
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
    };
  }
}
