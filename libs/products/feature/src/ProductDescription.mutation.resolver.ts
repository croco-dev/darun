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
  async retryProductDescriptionJob(@Arg('id') id: string): Promise<ProductDescriptionJob> {
    const job = await this.productDescriptionJobService.retryProductDescriptionJob(id);

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
}
