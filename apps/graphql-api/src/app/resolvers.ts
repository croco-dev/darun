import '../config';

import {
  CompanyMutationResolver,
  CompanyQueryResolver,
} from '@darun/companies-feature/server';
import { ImageMutationResolver } from '@darun/images-feature/server';
import {
  MagazineMutationResolver,
  MagazineQueryResolver,
} from '@darun/magazines-feature/server';
import {
  FeatureMutationResolver,
  FeatureQueryResolver,
  ProductMutationResolver,
  ProductQueryResolver,
} from '@darun/products-feature/server';
import { TranslationMutationResolver } from '@darun/translation-feature/server';
import type { NonEmptyArray } from 'type-graphql';
import { HealthResolver } from './graphql/Health.resolver';

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
