import '../config';

import { CompanyMutationResolver, CompanyQueryResolver } from '@darun/companies-feature/server';
import { ImageMutationResolver } from '@darun/images-feature/server';
import { MagazineMutationResolver, MagazineQueryResolver } from '@darun/magazines-feature/server';
import {
  AdminProductCategoriesResolver,
  CategoryQueryResolver,
  FeatureMutationResolver,
  FeatureQueryResolver,
  ProductDescriptionMutationResolver,
  ProductDescriptionQueryResolver,
  ProductFlowMutationResolver,
  ProductMutationResolver,
  ProductQueryResolver,
  ProductResearchMutationResolver,
  ProductResearchQueryResolver,
  ScreenshotFieldResolver,
  VisualFlowQueryResolver,
  VisualSaveMutationResolver,
  VisualScreenshotQueryResolver,
  VisualViewMutationResolver,
} from '@darun/products-feature/server';
import {
  LlmSettingResolver,
  TranslationMutationResolver,
  TranslationQueryResolver,
} from '@darun/translation-feature/server';
import { NonEmptyArray } from 'type-graphql';
import { AdminProductPublishReviewResolver } from './graphql/AdminProductPublishReview.resolver';
import { HealthResolver } from './graphql/Health.resolver';

// eslint-disable-next-line @typescript-eslint/ban-types
export const resolvers: NonEmptyArray<Function> = [
  HealthResolver,
  AdminProductCategoriesResolver,
  AdminProductPublishReviewResolver,
  CategoryQueryResolver,
  ProductQueryResolver,
  ScreenshotFieldResolver,
  VisualFlowQueryResolver,
  ProductFlowMutationResolver,
  ProductMutationResolver,
  VisualScreenshotQueryResolver,
  VisualViewMutationResolver,
  VisualSaveMutationResolver,
  ProductDescriptionQueryResolver,
  ProductDescriptionMutationResolver,
  ProductResearchQueryResolver,
  ProductResearchMutationResolver,
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
