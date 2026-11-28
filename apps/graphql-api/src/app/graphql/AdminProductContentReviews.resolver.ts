import { PostgresqlProductContentReviews } from '@darun/products-datasource';
import { isProductLinkUrl } from '@darun/products-domain/link';
import { AuthRole } from '@darun/utils-apollo-server';
import { GraphQLError } from 'graphql';
import {
  Arg,
  Authorized,
  Ctx,
  Field,
  ID,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  registerEnumType,
} from 'type-graphql';
import { Service } from 'typedi';
import type { GraphQLContext } from '../../functions/context';

enum ReviewFilter {
  ALL = 'ALL',
  UNREVIEWED = 'UNREVIEWED',
  CHANGED = 'CHANGED',
  DUE = 'DUE',
}

enum ReviewStatus {
  UNREVIEWED = 'UNREVIEWED',
  CHANGED = 'CHANGED',
  CURRENT = 'CURRENT',
}

registerEnumType(ReviewFilter, { name: 'AdminProductContentReviewFilter' });
registerEnumType(ReviewStatus, { name: 'AdminProductContentReviewStatus' });

@ObjectType('AdminProductContentReviewFeature')
class ReviewFeature {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  summary: string | null;
}

@ObjectType('AdminProductContentReviewRecord')
class ReviewRecord {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  reviewedRevision: string;

  @Field(() => ID)
  reviewerId: string;

  @Field(() => Date)
  reviewedAt: Date;

  @Field(() => String)
  memo: string;

  @Field(() => String, { nullable: true })
  referenceUrl: string | null;

  @Field(() => String, { nullable: true })
  nextReviewOn: string | null;
}

@ObjectType('AdminProductContentReviewHistory')
class ReviewHistory {
  @Field(() => [ReviewRecord])
  records: ReviewRecord[];

  @Field(() => String, { nullable: true })
  nextCursor: string | null;
}

@ObjectType('AdminProductContentReviewDetail')
class ReviewDetail {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  revision: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  summary: string;

  @Field(() => String, { nullable: true })
  description: string | null;

  @Field(() => [ReviewFeature])
  features: ReviewFeature[];

  @Field(() => ReviewStatus)
  status: ReviewStatus;

  @Field(() => Boolean)
  due: boolean;
}

@ObjectType('AdminProductContentReviewListItem')
class ReviewListItem {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  slug: string;

  @Field(() => ReviewStatus)
  status: ReviewStatus;

  @Field(() => Boolean)
  due: boolean;

  @Field(() => String, { nullable: true })
  nextReviewOn: string | null;
}

@ObjectType('AdminProductContentReviewPage')
class ReviewPage {
  @Field(() => [ReviewListItem])
  items: ReviewListItem[];

  @Field(() => String, { nullable: true })
  nextCursor: string | null;
}

@InputType('RecordAdminProductContentReviewInput')
class RecordReviewInput {
  @Field(() => ID)
  productId: string;

  @Field(() => String)
  expectedRevision: string;

  @Field(() => String)
  requestId: string;

  @Field(() => String)
  memo: string;

  @Field(() => String, { nullable: true })
  referenceUrl?: string;

  @Field(() => String, { nullable: true })
  nextReviewOn?: string;
}

function status(revision: bigint, reviewedRevision: bigint | null) {
  if (reviewedRevision === null) return ReviewStatus.UNREVIEWED;
  return reviewedRevision === revision ? ReviewStatus.CURRENT : ReviewStatus.CHANGED;
}

function badInput(message: string) {
  return new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

function parseRevision(value: string) {
  if (!/^\d{1,19}$/.test(value)) throw badInput('올바른 검토 버전을 입력해 주세요.');
  const revision = BigInt(value);
  if (revision > BigInt('9223372036854775807')) throw badInput('올바른 검토 버전을 입력해 주세요.');
  return revision;
}

function recordResponse<T extends { id: bigint; reviewedRevision: bigint }>(record: T) {
  return {
    ...record,
    id: record.id.toString(),
    reviewedRevision: record.reviewedRevision.toString(),
  };
}

function normalizeReview(input: RecordReviewInput) {
  const memo = input.memo.trim();
  const referenceUrl = input.referenceUrl?.trim() || null;
  const nextReviewOn = input.nextReviewOn?.trim() || null;
  if (!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(input.requestId)) {
    throw badInput('올바른 검토 요청 ID를 입력해 주세요.');
  }
  if (!memo) throw badInput('검토 메모를 입력해 주세요.');
  if (memo.length > 2000 || memo.includes('\0')) throw badInput('메모는 2,000자 이하로 입력해 주세요.');
  if (
    referenceUrl &&
    (referenceUrl.length > 2048 || !isProductLinkUrl(referenceUrl) || /[\s\p{Cc}]/u.test(referenceUrl))
  ) {
    throw badInput('참고 링크는 HTTP 또는 HTTPS 주소로 입력해 주세요.');
  }
  if (nextReviewOn) {
    const date = new Date(nextReviewOn + 'T00:00:00.000Z');
    if (
      !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(nextReviewOn) ||
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== nextReviewOn
    ) {
      throw badInput('올바른 다음 확인 날짜를 입력해 주세요.');
    }
  }
  return {
    productId: input.productId,
    requestId: input.requestId,
    reviewedRevision: parseRevision(input.expectedRevision),
    memo,
    referenceUrl,
    nextReviewOn,
  };
}

@Resolver()
@Service()
export class AdminProductContentReviewsResolver {
  constructor(private readonly reviews: PostgresqlProductContentReviews) {}

  @Authorized([AuthRole.Admin])
  @Query(() => ReviewDetail, {
    name: 'adminProductContentReview',
    nullable: true,
  })
  async detail(@Arg('slug', () => String) slug: string) {
    const detail = await this.reviews.detail(slug);
    if (!detail) return null;
    return {
      ...detail,
      status: status(detail.revision, detail.reviewedRevision),
      revision: detail.revision.toString(),
    };
  }

  @Authorized([AuthRole.Admin])
  @Query(() => ReviewHistory, { name: 'adminProductContentReviewHistory' })
  async history(
    @Arg('productId', () => ID) productId: string,
    @Arg('before', () => String, { nullable: true }) before?: string
  ) {
    const { records, nextCursor } = await this.reviews.history(
      productId,
      before == null ? null : parseRevision(before)
    );
    return { records: records.map(recordResponse), nextCursor };
  }

  @Authorized([AuthRole.Admin])
  @Query(() => ReviewPage, { name: 'adminProductContentReviewPage' })
  async page(
    @Arg('filter', () => ReviewFilter) filter: ReviewFilter,
    @Arg('after', () => String, { nullable: true }) after?: string
  ) {
    if (after != null && (after.length === 0 || after.length > 26 || after.includes('\0')))
      throw badInput('올바른 상품 목록 위치를 입력해 주세요.');
    const { items, nextCursor } = await this.reviews.list(filter, after ?? null);
    return {
      items: items.map(item => ({
        ...item,
        status: status(item.revision, item.reviewedRevision),
      })),
      nextCursor,
    };
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => ReviewRecord, { name: 'recordAdminProductContentReview' })
  async record(@Arg('input', () => RecordReviewInput) input: RecordReviewInput, @Ctx() context: GraphQLContext) {
    const reviewerId = await context.getUserIdOrThrow();
    const { record } = await this.reviews.record({
      ...normalizeReview(input),
      reviewerId,
    });
    if (!record) {
      throw new GraphQLError('검토 중 서비스 내용이 바뀌었습니다. 최신 내용을 다시 확인해 주세요.', {
        extensions: { code: 'PRODUCT_CONTENT_REVIEW_STALE' },
      });
    }
    return recordResponse(record);
  }
}
