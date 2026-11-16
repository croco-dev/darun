import { ProductScreenshotRepositoryToken } from '@darun/products-domain';
import type { ProductScreenshotRepository, VisualUiElement } from '@darun/products-domain';
import { AuthRole, type GraphQLContext } from '@darun/utils-apollo-server';
import DataLoader from 'dataloader';
import { Authorized, Ctx, FieldResolver, Resolver, Root } from 'type-graphql';
import { Inject, Service } from 'typedi';
import { Screenshot } from './graphs/Screenshot';
import { VisualUiElementGraph } from './graphs/VisualUiElement';

@Service()
@Resolver(() => Screenshot)
export class ScreenshotFieldResolver {
  private readonly loaders = new WeakMap<GraphQLContext, DataLoader<string, VisualUiElement[]>>();

  constructor(
    @Inject(ProductScreenshotRepositoryToken)
    private readonly repository: ProductScreenshotRepository
  ) {}

  @Authorized([AuthRole.Admin])
  @FieldResolver(() => [VisualUiElementGraph])
  uiElements(@Root() screenshot: Screenshot, @Ctx() context: GraphQLContext): Promise<VisualUiElement[]> {
    let loader = this.loaders.get(context);
    if (!loader) {
      loader = new DataLoader(
        async ids => {
          const elements = await this.repository.findScreenshotUiElementsByScreenshotIds(ids);
          return ids.map(id => elements[id] ?? []);
        },
        // Serial mutations (and HTTP batches) can read classifications after another write.
        { cache: false, maxBatchSize: 100 }
      );
      this.loaders.set(context, loader);
    }
    return loader.load(screenshot.id);
  }
}
