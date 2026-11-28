import { ReorderProductScreenshots } from '@darun/products-domain';
import { AuthRole } from '@darun/utils-apollo-server';
import { Arg, Authorized, ID, Mutation, Resolver } from 'type-graphql';
import { Service } from 'typedi';

@Resolver()
@Service()
export class ProductScreenshotOrderMutationResolver {
  constructor(private readonly reorderScreenshots: ReorderProductScreenshots) {}

  @Authorized([AuthRole.Admin])
  @Mutation(() => Boolean, { name: 'reorderProductScreenshots' })
  async reorderProductScreenshots(
    @Arg('productId', () => ID) productId: string,
    @Arg('orderedIds', () => [ID]) orderedIds: string[],
    @Arg('expectedOrderIds', () => [ID]) expectedOrderIds: string[]
  ): Promise<boolean> {
    await this.reorderScreenshots.execute(productId, orderedIds, expectedOrderIds);
    return true;
  }
}
