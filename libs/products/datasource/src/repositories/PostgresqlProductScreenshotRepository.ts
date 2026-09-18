import {
  ProductScreenshot,
  ProductScreenshotRepository,
  VisualScreenshotFilter,
  VisualScreenshotWithProduct,
  productScreenshotNotFound,
} from '@darun/products-domain';
import { ProductScreenshotRepositoryToken, productScreenshotInsertFailed } from '@darun/products-domain';
import { Drizzle, DrizzleToken } from '@darun/provider-database';
import DataLoader from 'dataloader';
import { and, count, eq, inArray, isNotNull, lt, or, sql } from 'drizzle-orm';
import { groupBy } from 'es-toolkit';
import { Inject, Service } from 'typedi';
import { products } from '../entities/ProductSchema';
import { productScreenshots } from '../entities/ProductScreenshotsSchema';

type ScreenshotRow = typeof productScreenshots.$inferSelect;

type VisualScreenshotRow = ScreenshotRow & {
  productName: string | null;
  productSlug: string | null;
  productSummary: string | null;
  productLogoUrl: string | null;
};

function toDomain(row: ScreenshotRow): ProductScreenshot {
  return new ProductScreenshot({
    id: row.id,
    imageUrl: row.imageUrl,
    imageAlt: row.imageAlt,
    productId: row.productId,
    title: row.title,
    platform: row.platform as ProductScreenshot['platform'],
    screenType: row.screenType as ProductScreenshot['screenType'],
  });
}

function toVisualWithProduct(row: VisualScreenshotRow): VisualScreenshotWithProduct {
  return {
    ...toDomain(row),
    productName: row.productName ?? '',
    productSlug: row.productSlug ?? '',
    productSummary: row.productSummary ?? '',
    productLogoUrl: row.productLogoUrl ?? '',
  };
}

const escapeLikeLiteral = (value: string) => value.replace(/([\\%_])/g, '\\$1');

function buildVisualFilterConditions(filter: VisualScreenshotFilter) {
  const conditions = [isNotNull(products.publishedAt)];

  if (filter.platform) {
    conditions.push(eq(productScreenshots.platform, filter.platform));
  }
  if (filter.screenType) {
    conditions.push(eq(productScreenshots.screenType, filter.screenType));
  }
  if (filter.productSlug) {
    conditions.push(eq(products.slug, filter.productSlug));
  }
  if (filter.query.length > 0) {
    const pattern = `%${escapeLikeLiteral(filter.query)}%`;
    conditions.push(
      or(
        sql`${products.name} ILIKE ${pattern} ESCAPE '\\'`,
        sql`${products.slug} ILIKE ${pattern} ESCAPE '\\'`,
        sql`${productScreenshots.title} ILIKE ${pattern} ESCAPE '\\'`,
        sql`${productScreenshots.imageAlt} ILIKE ${pattern} ESCAPE '\\'`
      )!
    );
  }

  return and(...conditions)!;
}

const visualScreenshotColumns = {
  id: productScreenshots.id,
  productId: productScreenshots.productId,
  imageUrl: productScreenshots.imageUrl,
  imageAlt: productScreenshots.imageAlt,
  title: productScreenshots.title,
  platform: productScreenshots.platform,
  screenType: productScreenshots.screenType,
  priority: productScreenshots.priority,
  createdAt: productScreenshots.createdAt,
  productName: products.name,
  productSlug: products.slug,
  productSummary: products.summary,
  productLogoUrl: products.logoUrl,
};

@Service(ProductScreenshotRepositoryToken)
export class PostgresqlProductScreenshotRepository implements ProductScreenshotRepository {
  private productIdLoader: DataLoader<string, ScreenshotRow[]>;
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {
    this.productIdLoader = new DataLoader(
      async (productIds: readonly string[]) => {
        const docs = await this.db
          .select()
          .from(productScreenshots)
          .where(inArray(productScreenshots.productId, [...productIds]));

        const groupByDocs = groupBy(docs, doc => doc.productId);
        return productIds.map(productId => groupByDocs[productId] || []);
      },
      {
        cache: true,
      }
    );
  }

  insert(productScreenshot: ProductScreenshot): Promise<ProductScreenshot> {
    return this.db
      .transaction(async tx => {
        const inserted = await tx
          .insert(productScreenshots)
          .values({
            id: productScreenshot.id,
            productId: productScreenshot.productId,
            imageUrl: productScreenshot.imageUrl,
            imageAlt: productScreenshot.imageAlt,
            title: productScreenshot.title,
            platform: productScreenshot.platform,
            screenType: productScreenshot.screenType,
            priority: 0,
          })
          .returning();

        if (!inserted[0]) {
          throw productScreenshotInsertFailed();
        }
        return toDomain(inserted[0]);
      })
      .then(result => {
        this.productIdLoader.clearAll();
        return result;
      });
  }

  async findManyByProductIdSortByPriorityDesc(productId: string): Promise<ProductScreenshot[]> {
    const docs = await this.productIdLoader.load(productId);
    return docs.map(toDomain);
  }

  async findById(id: string): Promise<ProductScreenshot | null> {
    const result = await this.db.select().from(productScreenshots).where(eq(productScreenshots.id, id)).limit(1);

    return result[0] ? toDomain(result[0]) : null;
  }

  updateById(
    id: string,
    modifier: (screenshot: ProductScreenshot) => ProductScreenshot,
    validateLocked?: (locked: ProductScreenshot) => Promise<void>
  ): Promise<ProductScreenshot> {
    return this.db
      .transaction(async tx => {
        const rows = await tx
          .select()
          .from(productScreenshots)
          .where(eq(productScreenshots.id, id))
          .for('update')
          .limit(1);
        const prev = rows[0] ? toDomain(rows[0]) : null;

        if (!prev) {
          throw productScreenshotNotFound();
        }

        if (validateLocked) {
          await validateLocked(prev);
        }

        const next = modifier(prev);
        const updated = await tx
          .update(productScreenshots)
          .set({
            imageAlt: next.imageAlt,
            title: next.title,
            platform: next.platform,
            screenType: next.screenType,
          })
          .where(eq(productScreenshots.id, id))
          .returning();

        if (!updated[0]) {
          throw productScreenshotNotFound();
        }
        return toDomain(updated[0]);
      })
      .then(result => {
        this.productIdLoader.clearAll();
        return result;
      });
  }

  async deleteById(id: string): Promise<void> {
    await this.db.delete(productScreenshots).where(eq(productScreenshots.id, id));
    this.productIdLoader.clearAll();
  }

  /**
   * 잠금 규약(접근 2): screenshot row를 FOR UPDATE로 잠근 트랜잭션에서
   * validateLocked를 실행한다. 통과하면 DB 행을 삭제한다. 실패하면
   * 트랜잭션이 rollback되고 행은 보존된다.
   */
  async deleteWithLock(id: string, validateLocked: (locked: ProductScreenshot) => Promise<void>): Promise<void> {
    await this.db.transaction(async tx => {
      const rows = await tx
        .select()
        .from(productScreenshots)
        .where(eq(productScreenshots.id, id))
        .for('update')
        .limit(1);
      const locked = rows[0] ? toDomain(rows[0]) : null;

      if (!locked) {
        throw productScreenshotNotFound();
      }

      await validateLocked(locked);
      await tx.delete(productScreenshots).where(eq(productScreenshots.id, id));
    });
    this.productIdLoader.clearAll();
  }

  async findManyVisualPublishedByFilterAndAfterIdAndLimit(
    filter: VisualScreenshotFilter,
    limit: number,
    afterId?: string
  ): Promise<VisualScreenshotWithProduct[]> {
    const conditions = [buildVisualFilterConditions(filter)];
    if (afterId) {
      conditions.push(lt(productScreenshots.id, afterId));
    }

    const rows = await this.db
      .select(visualScreenshotColumns)
      .from(productScreenshots)
      .innerJoin(products, eq(products.id, productScreenshots.productId))
      .where(and(...conditions))
      .orderBy(sql`${productScreenshots.id} DESC`)
      .limit(limit);

    return rows.map(toVisualWithProduct);
  }

  async findVisualPublishedById(id: string): Promise<VisualScreenshotWithProduct | null> {
    const rows = await this.db
      .select(visualScreenshotColumns)
      .from(productScreenshots)
      .innerJoin(products, eq(products.id, productScreenshots.productId))
      .where(and(isNotNull(products.publishedAt), eq(productScreenshots.id, id)))
      .limit(1);

    return rows[0] ? toVisualWithProduct(rows[0]) : null;
  }

  async countVisualPublishedByFilter(filter: VisualScreenshotFilter): Promise<number> {
    const rows = await this.db
      .select({ value: count() })
      .from(productScreenshots)
      .innerJoin(products, eq(products.id, productScreenshots.productId))
      .where(buildVisualFilterConditions(filter));

    return rows[0]?.value ?? 0;
  }
}
