import { PostgresqlProductPublishReview } from '@darun/products-datasource';
import { PRODUCT_DESCRIPTION_MEDIA_ELEMENTS } from '@darun/products-domain/info';
import { AuthRole } from '@darun/utils-apollo-server';
import { parse, type DefaultTreeAdapterMap } from 'parse5';
import { Arg, Authorized, Field, ID, ObjectType, Query, Resolver } from 'type-graphql';
import { Service } from 'typedi';

@ObjectType('AdminProductPublishTranslationField')
export class AdminProductPublishTranslationField {
  @Field(() => String)
  status: string;

  @Field(() => String, { nullable: true })
  sourceHash: string | null;
}

@ObjectType('AdminProductPublishTranslation')
export class AdminProductPublishTranslation {
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
export class AdminProductPublishReview {
  @Field(() => ID)
  id: string;

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

export type ReviewSource = NonNullable<Awaited<ReturnType<PostgresqlProductPublishReview['read']>>>;

const nonContentDescriptionTags = new Set(['iframe', 'noscript', 'script', 'style', 'template', 'title']);

function hasDescription(description: string): boolean {
  const document = parse(description, { scriptingEnabled: false });
  const html = document.childNodes.find(node => 'tagName' in node && node.tagName === 'html');
  const body =
    html && 'childNodes' in html && html.childNodes.find(node => 'tagName' in node && node.tagName === 'body');
  const pending: DefaultTreeAdapterMap['node'][] = body ? [body] : [];
  while (pending.length > 0) {
    const node = pending.pop()!;
    if ('value' in node && node.value.trim()) return true;
    if ('tagName' in node) {
      if (nonContentDescriptionTags.has(node.tagName) || node.attrs.some(attr => attr.name === 'hidden')) continue;
      if (PRODUCT_DESCRIPTION_MEDIA_ELEMENTS.some(tag => tag === node.tagName)) return true;
    }
    if ('childNodes' in node) {
      for (const child of node.childNodes) pending.push(child);
    }
  }
  return false;
}

@Resolver(() => AdminProductPublishReview)
@Service()
export class AdminProductPublishReviewQueryResolver {
  constructor(private readonly reviews: PostgresqlProductPublishReview) {}

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
      id: snapshot.productId,
      hasName: Boolean(snapshot.source.name.trim()),
      hasSummary: Boolean(snapshot.source.summary.trim()),
      hasDescription: hasDescription(snapshot.source.description),
    };
  }
}
