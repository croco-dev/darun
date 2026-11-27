import { PostgresqlProductPublishReview } from '@darun/products-datasource';
import { PRODUCT_DESCRIPTION_MEDIA_ELEMENTS } from '@darun/products-domain/info';
import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { PostgresqlTranslationRepository } from '@darun/translation-datasource';
import { computeSourceHash } from '@darun/translation-domain';
import { AuthRole } from '@darun/utils-apollo-server';
import { and, desc, eq } from 'drizzle-orm';
import { parse, type DefaultTreeAdapterMap } from 'parse5';
import { Arg, Authorized, Field, FieldResolver, ObjectType, Query, Resolver, Root } from 'type-graphql';
import { Inject, Service } from 'typedi';
import { translationJobs } from '../../../../../libs/translation/datasource/src/entities/TranslationJobSchema';

@ObjectType('AdminProductPublishTranslationField')
class AdminProductPublishTranslationField {
  @Field(() => String)
  status: string;

  @Field(() => String, { nullable: true })
  sourceHash: string | null;
}

@ObjectType('AdminProductPublishTranslation')
class AdminProductPublishTranslation {
  @Field(() => AdminProductPublishTranslationField)
  name: AdminProductPublishTranslationField;

  @Field(() => AdminProductPublishTranslationField)
  summary: AdminProductPublishTranslationField;

  @Field(() => AdminProductPublishTranslationField)
  description: AdminProductPublishTranslationField;

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
type ReviewSource = ReviewSnapshot & { hasDescription: boolean };

function hasDescription(description: string): boolean {
  const document = parse(description, { scriptingEnabled: false });
  const html = document.childNodes.find(node => 'tagName' in node && node.tagName === 'html');
  const body =
    html && 'childNodes' in html && html.childNodes.find(node => 'tagName' in node && node.tagName === 'body');
  const pending: DefaultTreeAdapterMap['node'][] = body ? [body] : [];
  while (pending.length > 0) {
    const node = pending.pop()!;
    if ('value' in node && node.value.trim()) return true;
    if ('tagName' in node && PRODUCT_DESCRIPTION_MEDIA_ELEMENTS.some(tag => tag === node.tagName)) return true;
    if ('childNodes' in node) {
      for (const child of node.childNodes) pending.push(child);
    }
  }
  return false;
}

@Resolver(() => AdminProductPublishReview)
@Service()
export class AdminProductPublishReviewResolver {
  constructor(
    private readonly reviews: PostgresqlProductPublishReview,
    @Inject(DrizzleToken) private readonly db: Drizzle
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
  async translation(@Root() snapshot: ReviewSource): Promise<AdminProductPublishTranslation> {
    const { productId, source } = snapshot;
    const fields = ['name', 'summary', 'description'] as const;
    const { translations, latestJob, observedAt } = await this.db.transaction(
      async tx => {
        const observedAt = new Date();
        const translations = await new PostgresqlTranslationRepository(tx).findMany({
          entityType: 'Product',
          locale: 'en',
          entities: fields.map(field => ({ entityId: productId, field })),
        });
        const [latestJob] = await tx
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
          .limit(1);
        return { translations, latestJob, observedAt };
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' }
    );
    const observe = (field: (typeof fields)[number]): AdminProductPublishTranslationField => {
      if (!(field === 'description' ? snapshot.hasDescription : source[field].trim()))
        return { status: 'NOT_NEEDED', sourceHash: null };
      const sourceHash = computeSourceHash(source[field], field);
      const row = translations.find(row => row.field === field);
      if (!row?.value.trim()) return { status: 'MISSING', sourceHash };
      return { status: row.sourceHash === sourceHash ? 'CURRENT' : 'STALE', sourceHash };
    };
    return {
      name: observe('name'),
      summary: observe('summary'),
      description: observe('description'),
      observedAt,
      latestJobFailed: latestJob?.status === 'failed',
    };
  }
}
