import { productIdempotencyKeyConflict } from '@darun/products-domain';
import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { and, asc, desc, eq, gt, lt, sql } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { productContentReviews } from '../entities/ProductContentReviewSchema';
import { productFeatures } from '../entities/ProductFeaturesSchema';
import { products } from '../entities/ProductSchema';
import { lockProductSource } from './productSourceMutex';

const seoulDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const pageSize = 20;
const reviews = productContentReviews;

export type ProductContentReviewFilter = 'ALL' | 'UNREVIEWED' | 'CHANGED' | 'DUE';

type RecordReview = Pick<
  typeof reviews.$inferInsert,
  'productId' | 'reviewerId' | 'requestId' | 'memo' | 'referenceUrl' | 'nextReviewOn'
> & { reviewedRevision: bigint };

@Service()
export class PostgresqlProductContentReviews {
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

  detail(slug: string) {
    return this.db.transaction(
      async tx => {
        const [product] = await tx
          .select({
            id: products.id,
            name: products.name,
            summary: products.summary,
            description: products.description,
            revision: products.contentRevision,
          })
          .from(products)
          .where(eq(products.slug, slug));
        if (!product) return null;

        const features = await tx
          .select({
            id: productFeatures.id,
            name: productFeatures.name,
            summary: productFeatures.summary,
          })
          .from(productFeatures)
          .where(eq(productFeatures.productId, product.id))
          .orderBy(asc(productFeatures.id));
        const [latest] = await tx
          .select({
            reviewedRevision: reviews.reviewedRevision,
            due: sql<boolean>`coalesce(${reviews.nextReviewOn} <= ${seoulDate.format(new Date())}::date, false)`,
          })
          .from(reviews)
          .where(eq(reviews.productId, product.id))
          .orderBy(desc(reviews.id))
          .limit(1);
        return {
          ...product,
          features,
          reviewedRevision: latest?.reviewedRevision ?? null,
          due: latest?.due ?? false,
        };
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' }
    );
  }

  async history(productId: string, before: bigint | null) {
    const rows = await this.db
      .select({
        id: reviews.id,
        reviewedRevision: reviews.reviewedRevision,
        reviewerId: reviews.reviewerId,
        reviewedAt: reviews.reviewedAt,
        memo: reviews.memo,
        referenceUrl: reviews.referenceUrl,
        nextReviewOn: reviews.nextReviewOn,
      })
      .from(reviews)
      .where(and(eq(reviews.productId, productId), before === null ? undefined : lt(reviews.id, before)))
      .orderBy(desc(reviews.id))
      .limit(pageSize + 1);
    const records = rows.slice(0, pageSize);
    return {
      records,
      nextCursor: rows.length > pageSize ? records[records.length - 1]!.id.toString() : null,
    };
  }

  async list(filter: ProductContentReviewFilter, after: string | null) {
    const latest = this.db
      .select({
        revision: reviews.reviewedRevision,
        nextReviewOn: reviews.nextReviewOn,
      })
      .from(reviews)
      .where(eq(reviews.productId, products.id))
      .orderBy(desc(reviews.id))
      .limit(1)
      .as('latest_review');
    const due = sql<boolean>`coalesce(${latest.nextReviewOn} <= ${seoulDate.format(new Date())}::date, false)`;
    const predicates = {
      ALL: undefined,
      UNREVIEWED: sql`${latest.revision} is null`,
      CHANGED: sql`${latest.revision} <> ${products.contentRevision}`,
      DUE: due,
    };
    const rows = await this.db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        revision: products.contentRevision,
        reviewedRevision: latest.revision,
        nextReviewOn: latest.nextReviewOn,
        due,
      })
      .from(products)
      .leftJoinLateral(latest, sql`true`)
      .where(and(predicates[filter], after === null ? undefined : gt(products.id, after)))
      .orderBy(asc(products.id))
      .limit(pageSize + 1);
    const items = rows.slice(0, pageSize);
    return {
      items,
      nextCursor: rows.length > pageSize ? items[items.length - 1]!.id : null,
    };
  }

  record(input: RecordReview) {
    return this.db.transaction(async tx => {
      const product = await lockProductSource(tx, input.productId);
      const [existing] = await tx
        .select()
        .from(reviews)
        .where(
          and(
            eq(reviews.productId, input.productId),
            eq(reviews.reviewerId, input.reviewerId),
            eq(reviews.requestId, input.requestId)
          )
        );

      if (existing) {
        if (
          existing.reviewedRevision !== input.reviewedRevision ||
          existing.memo !== input.memo ||
          existing.referenceUrl !== input.referenceUrl ||
          existing.nextReviewOn !== input.nextReviewOn
        ) {
          throw productIdempotencyKeyConflict('이미 사용된 검토 요청입니다.');
        }
        return { record: existing };
      }

      if (product.contentRevision !== input.reviewedRevision) return { record: null };
      const [record] = await tx
        .insert(reviews)
        .values({ ...input, reviewedAt: sql`clock_timestamp()` })
        .returning();
      if (!record) throw new Error('Product content review insert failed');
      return { record };
    });
  }
}
