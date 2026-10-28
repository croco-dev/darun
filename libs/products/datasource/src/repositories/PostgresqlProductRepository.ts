import {
  type ProductRepository,
  Product,
  ProductScreenshot,
  ProductRepositoryToken,
  productNotFound,
  productUpdateFailed,
  productSlugAlreadyExists,
} from '@darun/products-domain';
import { Drizzle } from '@darun/provider-database';
import { DrizzleToken } from '@darun/provider-database';
import DataLoader from 'dataloader';
import { and, asc, count, desc, eq, gt, ilike, inArray, isNotNull, lt, lte, getTableColumns, sql } from 'drizzle-orm';
import { keyBy } from 'es-toolkit';
import { Inject, Service } from 'typedi';
import { products } from '../entities/ProductSchema';
import { productScreenshots } from '../entities/ProductScreenshotsSchema';

import { beginProductContentWrite } from './productContentSync';
import { isProductSlugConflict } from './productSlugConflict';
import { lockCategoryMembership, lockProductSource } from './productSourceMutex';

@Service(ProductRepositoryToken)
export class PostgresqlProductRepository implements ProductRepository {
  private idLoader: DataLoader<string, Product | null>;
  private readonly coverLoader = new DataLoader<string, ProductScreenshot | null>(
    async ids => {
      const rows = await this.db
        .selectDistinctOn([productScreenshots.productId])
        .from(productScreenshots)
        .where(inArray(productScreenshots.productId, [...ids]))
        .orderBy(asc(productScreenshots.productId), desc(productScreenshots.priority), desc(productScreenshots.id));
      const byId = new Map(
        rows.map(row => [
          row.productId,
          new ProductScreenshot({
            ...row,
            platform: row.platform as ProductScreenshot['platform'],
            screenType: row.screenType as ProductScreenshot['screenType'],
          }),
        ])
      );
      return ids.map(id => byId.get(id) ?? null);
    },
    { cache: false }
  );

  private readonly previewLoader = new DataLoader<string, ProductScreenshot[]>(
    async ids => {
      const ranked = this.db
        .select({
          ...getTableColumns(productScreenshots),
          position:
            sql<number>`row_number() over (partition by ${productScreenshots.productId} order by ${productScreenshots.priority} desc, ${productScreenshots.id} desc)`.as(
              'preview_position'
            ),
        })
        .from(productScreenshots)
        .where(inArray(productScreenshots.productId, [...ids]))
        .as('ranked_previews');
      const rows = await this.db
        .select()
        .from(ranked)
        .where(lte(ranked.position, 3))
        .orderBy(asc(ranked.productId), asc(ranked.position));
      const byId = new Map<string, ProductScreenshot[]>();
      for (const row of rows) {
        const previews = byId.get(row.productId) ?? [];
        previews.push(
          new ProductScreenshot({
            ...row,
            platform: row.platform as ProductScreenshot['platform'],
            screenType: row.screenType as ProductScreenshot['screenType'],
          })
        );
        byId.set(row.productId, previews);
      }
      return ids.map(id => byId.get(id) ?? []);
    },
    { cache: false }
  );

  private readonly screenshotCountLoader = new DataLoader<string, number>(
    async ids => {
      const rows = await this.db
        .select({ productId: productScreenshots.productId, value: count() })
        .from(productScreenshots)
        .where(inArray(productScreenshots.productId, [...ids]))
        .groupBy(productScreenshots.productId);
      const byId = new Map(rows.map(row => [row.productId, Number(row.value)]));
      return ids.map(id => byId.get(id) ?? 0);
    },
    { cache: false }
  );

  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {
    this.idLoader = new DataLoader(async (ids: readonly string[]) => this.findByIdsInternal(ids), {
      cache: false,
    });
  }

  async findPublishedByIds(ids: string[]): Promise<(Product | null)[]> {
    return this.findPublishedByIdsInternal(ids);
  }

  publishById(id: string): Promise<Product> {
    return this.db.transaction(async tx => {
      const row = await lockProductSource(tx, id);
      if (row.publishedAt) return this.mapper(row);

      const finishContentWrite = await beginProductContentWrite(tx, id);
      const product = this.mapper(row);
      product.publish();
      const [updated] = await tx
        .update(products)
        .set({ publishedAt: product.publishedAt, updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning();
      if (!updated) throw productUpdateFailed();
      await finishContentWrite();
      return this.mapper(updated);
    });
  }

  registerCompanyById(id: string, companyId: string): Promise<Product> {
    return this.db.transaction(async tx => {
      await lockProductSource(tx, id);
      const [updated] = await tx
        .update(products)
        .set({ ownedCompanyId: companyId, updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning();
      if (!updated) throw productUpdateFailed();
      return this.mapper(updated);
    });
  }

  updateById(id: string, modifier: (product: Product) => Product): Promise<Product> {
    return this.db.transaction(async tx => {
      const finishContentWrite = await beginProductContentWrite(tx, id);
      const prevProduct = await tx
        .select()
        .from(products)
        .where(eq(products.id, id))
        .limit(1)
        .then(rows => (rows[0] ? this.mapper(rows[0]) : null));

      if (!prevProduct) {
        throw productNotFound();
      }

      const updated = await tx
        .update(products)
        .set({ ...modifier(prevProduct), updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning();
      if (!updated[0]) {
        throw productUpdateFailed();
      }

      await finishContentWrite();
      return this.mapper(updated[0]);
    });
  }

  async findAllByBeforeIdAndLimit(limit: number, id?: string | undefined): Promise<Product[]> {
    return (
      await this.db
        .select()
        .from(products)
        .where(id ? and(gt(products.id, id)) : undefined)
        .limit(limit)
        .orderBy(asc(products.id))
        .then(rows => rows.map(row => this.mapper(row)))
    ).reverse();
  }

  async findAllByAfterIdAndLimit(limit: number, id?: string | undefined): Promise<Product[]> {
    return this.db
      .select()
      .from(products)
      .where(id ? and(lt(products.id, id)) : undefined)
      .limit(limit)
      .orderBy(desc(products.id))
      .then(rows => rows.map(row => this.mapper(row)));
  }

  async findPublishedByAfterIdAndLimit(limit: number, id?: string | undefined): Promise<Product[]> {
    return this.db
      .select()
      .from(products)
      .where(and(isNotNull(products.publishedAt), id ? lt(products.id, id) : undefined))
      .limit(limit)
      .orderBy(desc(products.id))
      .then(rows => rows.map(row => this.mapper(row)));
  }

  async countAll(): Promise<number> {
    return this.db
      .select({ value: count() })
      .from(products)
      .then(rows => Number(rows[0]?.value ?? 0));
  }

  async insert(values: Product): Promise<Product | null> {
    try {
      return await this.db.transaction(async tx => {
        await lockCategoryMembership(tx, 'shared');
        const inserted = await tx
          .insert(products)
          .values({ ...values })
          .returning();

        return inserted[0] ? this.mapper(inserted[0]) : null;
      });
    } catch (error) {
      if (isProductSlugConflict(error)) throw productSlugAlreadyExists();
      throw error;
    }
  }

  async countPublishedAll(): Promise<number> {
    return this.db
      .select({ value: count() })
      .from(products)
      .where(isNotNull(products.publishedAt))
      .then(rows => Number(rows[0]?.value ?? 0));
  }

  async findOneBySlug(slug: string): Promise<Product | null> {
    return this.db
      .select()
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1)
      .then(rows => (rows[0] ? this.mapper(rows[0]) : null));
  }

  async findOneById(id: string): Promise<Product | null> {
    return this.idLoader.load(id);
  }

  /** 요청 간 DataLoader cache를 우회해 현재 commit된 Product 행을 읽는다. */
  async findOneFreshById(id: string): Promise<Product | null> {
    const [product] = await this.findByIdsInternal([id]);
    return product ?? null;
  }

  async findPublishedOneBySlug(slug: string): Promise<Product | null> {
    return this.db
      .select()
      .from(products)
      .where(and(eq(products.slug, slug), isNotNull(products.publishedAt)))
      .limit(1)
      .then(rows => (rows[0] ? this.mapper(rows[0]) : null));
  }

  async findPublishedOneById(id: string): Promise<Product | null> {
    return this.findPublishedByIds([id]).then(results => results[0] ?? null);
  }

  async findTopNSortByPublishedAtDesc(n: number): Promise<Product[]> {
    return this.db
      .select()
      .from(products)
      .where(isNotNull(products.publishedAt))
      .orderBy(desc(products.publishedAt))
      .limit(n)
      .then(rows => rows.map(row => this.mapper(row)));
  }

  async findPublishedByCategoryId(categoryId: string, limit: number, afterId?: string): Promise<Product[]> {
    return this.db
      .select()
      .from(products)
      .where(
        and(
          isNotNull(products.publishedAt),
          sql`${products.categoryIds}::jsonb @> ${JSON.stringify([categoryId])}`,
          afterId ? lt(products.id, afterId) : undefined
        )
      )
      .orderBy(desc(products.id))
      .limit(limit)
      .then(rows => rows.map(row => this.mapper(row)));
  }

  async hasPublishedAlternatives(productId: string): Promise<boolean> {
    const rows = await this.db
      .select({
        value: sql<boolean>`(
      exists (select 1 from alternative_products a join products p on p.id = a.alternative_product_id
        where a.product_id = ${productId} and p.published_at is not null)
      or ((select count(*) from (select 1 from alternative_products where product_id = ${productId} limit 5) manual) < 5
        and ${products.publishedAt} is not null and (
      exists (select 1 from products p join products source on source.id = ${productId}
        where p.published_at is not null and p.id <> source.id
          and p.category_ids::jsonb ?| array(select jsonb_array_elements_text(source.category_ids::jsonb)))
      or exists (select 1 from (select id from products where published_at is not null order by published_at desc limit 50) p
        join product_tags candidate on candidate.product_id = p.id
        join product_tags source on source.tag_id = candidate.tag_id
        where source.product_id = ${productId} and p.id <> ${productId})
      ))
    )`,
      })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    return rows[0]?.value ?? false;
  }

  async countPublishedByCategoryId(categoryId: string): Promise<number> {
    const rows = await this.db
      .select({ value: count() })
      .from(products)
      .where(
        and(isNotNull(products.publishedAt), sql`${products.categoryIds}::jsonb @> ${JSON.stringify([categoryId])}`)
      );
    return Number(rows[0]?.value ?? 0);
  }

  async findVisualApps({
    limit,
    afterId,
    query,
    productSlug,
  }: {
    limit: number;
    afterId?: string;
    query?: string;
    productSlug?: string;
  }) {
    const filter = and(
      isNotNull(products.publishedAt),
      sql`exists (select 1 from ${productScreenshots} where ${productScreenshots.productId} = ${products.id})`,
      query ? ilike(products.name, `%${query.replace(/[\\%_]/g, '\\$&')}%`) : undefined,
      productSlug ? eq(products.slug, productSlug) : undefined
    );
    const [rows, totals] = await Promise.all([
      this.db
        .select()
        .from(products)
        .where(and(filter, afterId ? lt(products.id, afterId) : undefined))
        .orderBy(desc(products.id))
        .limit(limit),
      this.db.select({ value: count() }).from(products).where(filter),
    ]);
    return {
      products: rows.map(row => this.mapper(row)),
      total: Number(totals[0]?.value ?? 0),
    };
  }

  async findVisualAppPreviews(productId: string): Promise<ProductScreenshot[]> {
    return this.previewLoader.load(productId);
  }

  async findVisualAppCover(productId: string): Promise<ProductScreenshot | null> {
    return this.coverLoader.load(productId);
  }

  async countVisualAppScreenshots(productId: string): Promise<number> {
    return this.screenshotCountLoader.load(productId);
  }

  async findPublishedByCategoryIdAndLimit(categoryId: string, limit: number): Promise<Product[]> {
    return this.db
      .select()
      .from(products)
      .where(
        and(isNotNull(products.publishedAt), sql`${products.categoryIds}::jsonb @> ${JSON.stringify([categoryId])}`)
      )
      .orderBy(desc(products.publishedAt))
      .limit(limit)
      .then(rows => rows.map(row => this.mapper(row)));
  }

  private async findPublishedByIdsInternal(ids: readonly string[]): Promise<(Product | null)[]> {
    if (!ids.length) {
      return [];
    }

    const docs = await this.db
      .select()
      .from(products)
      .where(and(inArray(products.id, [...ids]), isNotNull(products.publishedAt)));

    const groupByDocs = keyBy(docs, doc => doc.id);

    return ids.map(id => (groupByDocs[id] ? this.mapper(groupByDocs[id]) : null));
  }

  private async findByIdsInternal(ids: readonly string[]): Promise<(Product | null)[]> {
    if (!ids.length) {
      return [];
    }

    const docs = await this.db
      .select()
      .from(products)
      .where(inArray(products.id, [...ids]));

    const groupByDocs = keyBy(docs, doc => doc.id);

    return ids.map(id => (groupByDocs[id] ? this.mapper(groupByDocs[id]) : null));
  }

  private mapper<ProductType extends typeof products.$inferSelect | typeof products.$inferInsert>(
    schema: ProductType
  ): Product {
    return new Product({
      ...schema,
      ownedCompanyId: schema.ownedCompanyId ?? undefined,
      description: schema.description ?? undefined,
      publishedAt: schema.publishedAt ?? undefined,
      updatedAt: schema.updatedAt ?? undefined,
      categoryIds: schema.categoryIds ?? [],
    });
  }
}
