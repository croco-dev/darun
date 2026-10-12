import {
  TagType,
  Product,
  type ProductResearchMaterializationRepository,
  ProductResearchMaterializationRepositoryToken,
  type ValidatedReviewedProductInput,
  productInvalidArgs,
  productSlugAlreadyExists,
} from '@darun/products-domain';
import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { ulid } from 'ulid';
import { categories } from '../entities/CategorySchema';
import { productFeatures } from '../entities/ProductFeaturesSchema';
import { productLinks } from '../entities/ProductLinksSchema';
import { productResearchJobs } from '../entities/ProductResearchJobSchema';
import { products } from '../entities/ProductSchema';
import { productTags } from '../entities/ProductTagsSchema';
import { tags } from '../entities/TagSchema';

const PG_UNIQUE_VIOLATION = '23505';

function isUniqueViolationError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === PG_UNIQUE_VIOLATION
  );
}

@Service(ProductResearchMaterializationRepositoryToken)
export class PostgresqlProductResearchMaterializationRepository implements ProductResearchMaterializationRepository {
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

  async materialize(input: ValidatedReviewedProductInput): Promise<{
    product: Product;
    alreadyCreated: boolean;
  }> {
    try {
      return await this.db.transaction(async tx => {
        // 잠금 순서: research job row(FOR UPDATE) → product/source rows.
        const jobRows = await tx
          .select()
          .from(productResearchJobs)
          .where(eq(productResearchJobs.id, input.researchJobId))
          .for('update')
          .limit(1);
        const jobRow = jobRows[0];
        if (!jobRow) {
          throw productInvalidArgs('존재하지 않는 조사 작업입니다.');
        }
        if (jobRow.status !== 'completed') {
          throw productInvalidArgs('완료된 조사 작업만 적용할 수 있습니다.');
        }
        if (jobRow.materializedProductId) {
          const existingRows = await tx
            .select()
            .from(products)
            .where(eq(products.id, jobRow.materializedProductId))
            .limit(1);
          const existing = existingRows[0];
          if (!existing) {
            throw productInvalidArgs('조사 작업과 연결된 서비스를 찾을 수 없습니다.');
          }
          return {
            product: new Product({
              ...existing,
              ownedCompanyId: existing.ownedCompanyId ?? undefined,
              description: existing.description ?? undefined,
              publishedAt: existing.publishedAt ?? undefined,
              updatedAt: existing.updatedAt ?? undefined,
              categoryIds: existing.categoryIds ?? [],
            }),
            alreadyCreated: true,
          };
        }

        const categoryRows =
          input.categoryIds.length > 0
            ? await tx
                .select()
                .from(categories)
                .where(inArray(categories.id, [...input.categoryIds]))
            : [];
        if (categoryRows.length !== input.categoryIds.length) {
          throw productInvalidArgs('카테고리를 다시 선택해 주세요.');
        }

        const insertedProducts = await tx
          .insert(products)
          .values({
            name: input.name,
            slug: input.slug,
            summary: input.summary,
            logoUrl: input.logoUrl,
            description: null,
            categoryIds: [...input.categoryIds],
            publishedAt: null,
          })
          .returning();
        const inserted = insertedProducts[0];
        if (!inserted) {
          throw productInvalidArgs('서비스 저장에 실패했습니다.');
        }
        const productId = inserted.id;

        const hostname = new URL(input.officialUrl).hostname.toLowerCase();
        await tx.insert(productLinks).values({
          productId,
          title: `${input.name} 공식 사이트`,
          iconUrl: input.logoUrl,
          link: input.officialUrl,
          displayLink: hostname.slice(0, 100),
        });

        if (input.features.length > 0) {
          await tx.insert(productFeatures).values(
            input.features.map(feature => ({
              productId,
              name: feature.name,
              emoji: feature.emoji,
              summary: feature.summary,
            }))
          );
        }

        if (input.tags.length > 0) {
          await tx
            .insert(tags)
            .values(
              input.tags.map(name => ({
                id: ulid(),
                name,
                type: TagType.Simple,
                count: 0,
              }))
            )
            .onConflictDoNothing({ target: tags.name });
          const tagRows = await tx
            .select()
            .from(tags)
            .where(inArray(tags.name, [...input.tags]));
          await tx
            .insert(productTags)
            .values(tagRows.map(tag => ({ productId, tagId: tag.id })))
            .onConflictDoNothing({ target: [productTags.productId, productTags.tagId] });
        }

        const marked = await tx
          .update(productResearchJobs)
          .set({
            materializedProductId: productId,
            appliedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(eq(productResearchJobs.id, input.researchJobId), isNull(productResearchJobs.materializedProductId))
          )
          .returning();
        if (!marked[0]) {
          // 조건부 확정이 실패했다는 것은 이미 이 job이 확정됐다는 뜻이다.
          // 삽입한 product/source rows는 이 트랜잭션이 롤백하므로 고아 행이 남지 않는다.
          // 정상 재시도(이미 확정된 job 조회)는 위의 early-return이 처리한다.
          throw productInvalidArgs('이미 적용된 조사 작업입니다. 다시 조회해 주세요.');
        }

        return {
          product: new Product({
            ...inserted,
            ownedCompanyId: inserted.ownedCompanyId ?? undefined,
            description: inserted.description ?? undefined,
            publishedAt: inserted.publishedAt ?? undefined,
            updatedAt: inserted.updatedAt ?? undefined,
            categoryIds: inserted.categoryIds ?? [],
          }),
          alreadyCreated: false,
        };
      });
    } catch (error) {
      if (isUniqueViolationError(error)) {
        throw productSlugAlreadyExists();
      }
      throw error;
    }
  }
}
