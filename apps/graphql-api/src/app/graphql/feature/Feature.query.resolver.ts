import { GetProductFeature, GetProductFeatureScreenshots } from '@darun/backend';
import { Arg, FieldResolver, ID, Query, Resolver, Root } from 'type-graphql';
import { Service } from 'typedi';
import { Feature } from './graphs/Feature';
import { FeatureScreenshot } from './graphs/FeatureScreenshot';

@Resolver(() => Feature)
@Service()
export class FeatureQueryResolver {
  constructor(
    private readonly getProductFeatureScreenshots: GetProductFeatureScreenshots,
    private readonly getProductFeature: GetProductFeature
  ) {}

  @FieldResolver(() => [FeatureScreenshot])
  public screenshots(@Root() feature: Feature) {
    return this.getProductFeatureScreenshots.execute({ featureId: feature.id });
  }

  @Query(() => Feature, { nullable: true })
  public feature(@Arg('id', () => ID) id: string) {
    return this.getProductFeature.execute({ id });
  }
}
