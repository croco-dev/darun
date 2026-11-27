import { PostgresqlProductTranslationObservation } from '@darun/translation-datasource';
import { computeSourceHash } from '@darun/translation-domain';
import { AuthRole } from '@darun/utils-apollo-server';
import { Authorized, FieldResolver, Resolver, Root } from 'type-graphql';
import { Service } from 'typedi';
import {
  AdminProductPublishReview,
  AdminProductPublishTranslation,
  AdminProductPublishTranslationField,
  type ReviewSource,
} from './AdminProductPublishReview.query.resolver';

@Resolver(() => AdminProductPublishReview)
@Service()
export class AdminProductPublishReviewFieldResolver {
  constructor(private readonly observations: PostgresqlProductTranslationObservation) {}

  @Authorized([AuthRole.Admin])
  @FieldResolver(() => AdminProductPublishTranslation, { nullable: true })
  async translation(@Root() snapshot: ReviewSource): Promise<AdminProductPublishTranslation> {
    const { productId, source } = snapshot;
    const fields = ['name', 'summary', 'description'] as const;
    const { translations, latestJobFailed, observedAt } = await this.observations.read(productId, [...fields]);
    const observe = (field: (typeof fields)[number]): AdminProductPublishTranslationField => {
      const value = source[field];
      if (!value.trim() && field !== 'name') return { status: 'NOT_NEEDED', sourceHash: null };
      const sourceHash = computeSourceHash(value, field);
      const row = translations.find(row => row.field === field);
      if (!row) return { status: 'MISSING', sourceHash };
      return { status: row.sourceHash === sourceHash ? 'CURRENT' : 'STALE', sourceHash };
    };
    return {
      name: observe('name'),
      summary: observe('summary'),
      description: observe('description'),
      observedAt,
      latestJobFailed,
    };
  }
}
