import '../config';

import { NonEmptyArray } from 'type-graphql';
import { FeatureQueryResolver } from './graphql/feature/Feature.query.resolver';
import { HealthResolver } from './graphql/Health.resolver';
import { ProductMutationResolver } from './graphql/product/Product.mutation.resolver';
import { ProductQueryResolver } from './graphql/product/Product.query.resolver';

// eslint-disable-next-line @typescript-eslint/ban-types
export const resolvers: NonEmptyArray<Function> = [
  HealthResolver,
  ProductQueryResolver,
  ProductMutationResolver,
  FeatureQueryResolver,
];
