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
  ProductScreenshotOrderMutationResolver,
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
import { AdminProductContentReviewsResolver } from './graphql/AdminProductContentReviews.resolver';
import { AdminProductPublishReviewFieldResolver } from './graphql/AdminProductPublishReview.field.resolver';
import { AdminProductPublishReviewQueryResolver } from './graphql/AdminProductPublishReview.query.resolver';
import { AdminProductUsageConditionsResolver } from './graphql/AdminProductUsageConditions.resolver';
import { HealthResolver } from './graphql/Health.resolver';

export const resolvers: NonEmptyArray<Function> = [
  HealthResolver,
  AdminProductContentReviewsResolver,
  AdminProductUsageConditionsResolver,
  AdminProductCategoriesResolver,
  AdminProductPublishReviewQueryResolver,
  AdminProductPublishReviewFieldResolver,
  CategoryQueryResolver,
  ProductQueryResolver,
  ScreenshotFieldResolver,
  VisualFlowQueryResolver,
  ProductFlowMutationResolver,
  ProductMutationResolver,
  ProductScreenshotOrderMutationResolver,
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
