import { GetProductFeature, GetProductFeatureScreenshots } from '@darun/backend';
import { AuthRole } from '@darun/utils-apollo-server';
import { Arg, Authorized, FieldResolver, Query, Resolver, Root } from 'type-graphql';
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

  @Authorized([AuthRole.Admin])
  @Query(() => Feature, { nullable: true })
  public adminFeatureById(@Arg('id', () => String) id: string) {
    return this.getProductFeature.execute({ id });
  }
}
