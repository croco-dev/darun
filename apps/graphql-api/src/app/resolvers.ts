import '../config';

import { CompanyMutationResolver, CompanyQueryResolver } from '@darun/companies-feature/server';
import { ImageMutationResolver } from '@darun/images-feature/server';
import { MagazineMutationResolver, MagazineQueryResolver } from '@darun/magazines-feature/server';
import {
  CategoryQueryResolver,
  FeatureMutationResolver,
  FeatureQueryResolver,
  ProductDescriptionMutationResolver,
  ProductDescriptionQueryResolver,
  ProductMutationResolver,
  ProductQueryResolver,
} from '@darun/products-feature/server';
import {
  LlmSettingResolver,
  TranslationMutationResolver,
  TranslationQueryResolver,
} from '@darun/translation-feature/server';
import { NonEmptyArray } from 'type-graphql';
import { HealthResolver } from './graphql/Health.resolver';

// eslint-disable-next-line @typescript-eslint/ban-types
export const resolvers: NonEmptyArray<Function> = [
  HealthResolver,
  CategoryQueryResolver,
  ProductQueryResolver,
  ProductMutationResolver,
  ProductDescriptionQueryResolver,
  ProductDescriptionMutationResolver,
  FeatureQueryResolver,
  CompanyQueryResolver,
  CompanyMutationResolver,
  FeatureMutationResolver,
  ImageMutationResolver,
  MagazineMutationResolver,
  MagazineQueryResolver,
  TranslationMutationResolver,
  TranslationQueryResolver,
  LlmSettingResolver,
];
