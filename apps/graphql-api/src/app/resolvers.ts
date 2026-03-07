import '../config';

import {
  FeatureMutationResolver,
  FeatureQueryResolver,
  ProductMutationResolver,
  ProductQueryResolver,
} from '@darun/products-feature';
import { NonEmptyArray } from 'type-graphql';
import { CompanyMutationResolver } from './graphql/company/Company.mutation.resolver';
import { CompanyQueryResolver } from './graphql/company/Company.query.resolver';
import { HealthResolver } from './graphql/Health.resolver';
import { ImageMutationResolver } from './graphql/image/Image.mutation.resolver';
import { MagazineMutationResolver } from './graphql/magazine/Magazine.mutation.resolver';
import { MagazineQueryResolver } from './graphql/magazine/Magazine.query.resolver';
import { TranslationMutationResolver } from './graphql/translation/Translation.mutation.resolver';

// eslint-disable-next-line @typescript-eslint/ban-types
export const resolvers: NonEmptyArray<Function> = [
  HealthResolver,
  ProductQueryResolver,
  ProductMutationResolver,
  FeatureQueryResolver,
  CompanyQueryResolver,
  CompanyMutationResolver,
  FeatureMutationResolver,
  ImageMutationResolver,
  MagazineMutationResolver,
  MagazineQueryResolver,
  TranslationMutationResolver,
];
