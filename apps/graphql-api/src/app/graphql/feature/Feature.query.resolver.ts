import { GetProductFeatureScreenshots } from '@darun/backend';
import { FieldResolver, Resolver, Root } from 'type-graphql';
import { Service } from 'typedi';
import { Feature } from './graphs/Feature';
import { FeatureScreenshot } from './graphs/FeatureScreenshot';

@Resolver(() => Feature)
@Service()
export class FeatureQueryResolver {
  constructor(private readonly getProductFeatureScreenshots: GetProductFeatureScreenshots) {}

  @FieldResolver(() => [FeatureScreenshot])
  public screenshots(@Root() feature: Feature) {
    return this.getProductFeatureScreenshots.execute({ featureId: feature.id });
  }
}
