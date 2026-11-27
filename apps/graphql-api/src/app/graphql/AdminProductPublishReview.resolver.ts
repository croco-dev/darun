import { PostgresqlProductPublishReview } from '@darun/products-datasource';
import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { computeSourceHash, TranslationRepositoryToken, type TranslationRepository } from '@darun/translation-domain';
import { AuthRole } from '@darun/utils-apollo-server';
import { and, desc, eq } from 'drizzle-orm';
import { Arg, Authorized, Field, FieldResolver, ObjectType, Query, Resolver, Root } from 'type-graphql';
import { Inject, Service } from 'typedi';
import { translationJobs } from '../../../../../libs/translation/datasource/src/entities/TranslationJobSchema';

@ObjectType('AdminProductPublishTranslation')
class AdminProductPublishTranslation {
  @Field(() => String)
  name: string;

  @Field(() => String)
  summary: string;

  @Field(() => String)
  description: string;

  @Field(() => Date)
  observedAt: Date;

  @Field(() => Boolean)
  latestJobFailed: boolean;
}

@ObjectType('AdminProductPublishReview')
class AdminProductPublishReview {
  @Field(() => Date, { nullable: true })
  publishedAt: Date | null;

  @Field(() => String)
  reviewToken: string;

  @Field(() => Boolean)
  hasName: boolean;

  @Field(() => Boolean)
  hasSummary: boolean;

  @Field(() => Boolean)
  hasDescription: boolean;

  @Field(() => Boolean)
  hasCategory: boolean;

  @Field(() => Boolean)
  hasLogo: boolean;

  @Field(() => Boolean)
  hasScreenshot: boolean;

  @Field(() => String)
  officialLinkStatus: string;
}

type ReviewSnapshot = NonNullable<Awaited<ReturnType<PostgresqlProductPublishReview['read']>>>;

function hasDescription(description: string): boolean {
  // The rich-text editor can serialize an empty document as a paragraph.
  return Boolean(description.replace(/<\/?p\b[^>]*>|<br\s*\/?>|&nbsp;|&#160;/gi, '').trim());
}

@Resolver(() => AdminProductPublishReview)
@Service()
export class AdminProductPublishReviewResolver {
  constructor(
    private readonly reviews: PostgresqlProductPublishReview,
    @Inject(DrizzleToken) private readonly db: Drizzle,
    @Inject(TranslationRepositoryToken)
    private readonly translations: TranslationRepository
  ) {}

  @Authorized([AuthRole.Admin])
  @Query(() => AdminProductPublishReview, {
    name: 'adminProductPublishReview',
    nullable: true,
  })
  async review(@Arg('slug', () => String) slug: string) {
    const snapshot = await this.reviews.read(slug);
    if (!snapshot) return null;
    return {
      ...snapshot,
      hasName: Boolean(snapshot.source.name.trim()),
      hasSummary: Boolean(snapshot.source.summary.trim()),
      hasDescription: hasDescription(snapshot.source.description),
    };
  }

  @Authorized([AuthRole.Admin])
  @FieldResolver(() => AdminProductPublishTranslation, { nullable: true })
  async translation(@Root() snapshot: ReviewSnapshot): Promise<AdminProductPublishTranslation> {
    const { productId, source } = snapshot;
    const fields = ['name', 'summary', 'description'] as const;
    const [translations, [latestJob]] = await Promise.all([
      this.translations.findMany({
        entityType: 'Product',
        locale: 'en',
        entities: fields.map(field => ({ entityId: productId, field })),
      }),
      this.db
        .select({ status: translationJobs.status })
        .from(translationJobs)
        .where(
          and(
            eq(translationJobs.entityType, 'Product'),
            eq(translationJobs.entityId, productId),
            eq(translationJobs.locale, 'en')
          )
        )
        .orderBy(desc(translationJobs.createdAt), desc(translationJobs.id))
        .limit(1),
    ]);
    const status = (field: (typeof fields)[number]) => {
      if (!(field === 'description' ? hasDescription(source[field]) : source[field].trim())) return 'NOT_NEEDED';
      const row = translations.find(row => row.field === field);
      if (!row?.value.trim()) return 'MISSING';
      return row.sourceHash === computeSourceHash(source[field], field) ? 'CURRENT' : 'STALE';
    };
    return {
      name: status('name'),
      summary: status('summary'),
      description: status('description'),
      observedAt: new Date(),
      latestJobFailed: latestJob?.status === 'failed',
    };
  }
}
