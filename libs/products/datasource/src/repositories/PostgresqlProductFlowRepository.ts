import {
  ProductFlow,
  ProductScreenshot,
  ProductFlowRepositoryToken,
  type ProductFlowRepository,
  type VisualFlowDetail,
  type VisualFlowFilter,
  type VisualFlowSummary,
  productFlowNotFound,
} from '@darun/products-domain';
import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { and, asc, count, eq, inArray, isNotNull, lt, or, sql } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { productFlowSteps, productFlows } from '../entities/ProductFlowsSchema';
import { products } from '../entities/ProductSchema';
import { productScreenshots } from '../entities/ProductScreenshotsSchema';

type FlowRow = typeof productFlows.$inferSelect;
type StepRow = typeof productFlowSteps.$inferSelect;
type ScreenshotRow = typeof productScreenshots.$inferSelect;

type Tx = Parameters<Parameters<Drizzle['transaction']>[0]>[0];

const escapeLikeLiteral = (value: string) => value.replace(/([\\%_])/g, '\\$1');

function toDomain(flow: FlowRow, steps: StepRow[]): ProductFlow {
  return new ProductFlow({
    id: flow.id,
    productId: flow.productId,
    title: flow.title,
    description: flow.description,
    platform: flow.platform,
    flowType: flow.flowType,
    steps: steps
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(step => ({ screenshotId: step.screenshotId, caption: step.caption })),
  });
}

function toScreenshotDomain(row: ScreenshotRow): ProductScreenshot {
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

function buildVisualFlowFilterConditions(filter: VisualFlowFilter) {
  const conditions = [isNotNull(products.publishedAt)];

  if (filter.platform) {
    conditions.push(eq(productFlows.platform, filter.platform));
  }
  if (filter.flowType) {
    conditions.push(eq(productFlows.flowType, filter.flowType));
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
        sql`${productFlows.title} ILIKE ${pattern} ESCAPE '\\'`,
        sql`${productFlows.description} ILIKE ${pattern} ESCAPE '\\'`
      )!
    );
  }

  return and(...conditions)!;
}

const coverColumn = (column: 'id' | 'image_url' | 'image_alt') => sql<string | null>`(
  SELECT ps.${sql.raw(column)}
  FROM product_flow_steps cover_join
  INNER JOIN product_screenshots ps ON ps.id = cover_join.screenshot_id
  WHERE cover_join.flow_id = ${productFlows.id} AND cover_join.position = 0
  LIMIT 1
)`;

const stepCountExpr = sql<number>`(
  SELECT COUNT(*)::int FROM product_flow_steps step_count_join WHERE step_count_join.flow_id = ${productFlows.id}
)`;

function toVisualSummary(row: {
  id: string;
  title: string;
  description: string;
  platform: string;
  flowType: string;
  stepCount: number;
  coverId: string | null;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  productId: string;
  productName: string | null;
  productSlug: string | null;
}): VisualFlowSummary | null {
  if (!row.coverId || !row.coverImageUrl || !row.coverImageAlt || !row.productName || !row.productSlug) {
    return null;
  }
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    platform: row.platform,
    flowType: row.flowType,
    stepCount: row.stepCount,
    coverScreenshot: { id: row.coverId, imageUrl: row.coverImageUrl, imageAlt: row.coverImageAlt },
    productId: row.productId,
    productName: row.productName,
    productSlug: row.productSlug,
  };
}

@Service(ProductFlowRepositoryToken)
export class PostgresqlProductFlowRepository implements ProductFlowRepository {
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

  /**
   * 잠금 규약(접근 2): 단계 screenshot rows를 ID 오름차순으로 FOR UPDATE로 잠근다.
   * 호출한 검증기가 실패하면 트랜잭션이 rollback되고 잠금도 해제된다.
   */
  private async lockStepScreenshots(tx: Tx, screenshotIds: string[]): Promise<ProductScreenshot[]> {
    const sortedIds = [...screenshotIds].sort();
    const rows = await tx
      .select()
      .from(productScreenshots)
      .where(inArray(productScreenshots.id, sortedIds))
      .for('update')
      .orderBy(asc(productScreenshots.id));
    return rows.map(toScreenshotDomain);
  }

  async insert(
    flow: ProductFlow,
    validateSteps: (lockedScreenshots: ProductScreenshot[]) => void
  ): Promise<ProductFlow> {
    return this.db.transaction(async tx => {
      const locked = await this.lockStepScreenshots(
        tx,
        flow.steps.map(step => step.screenshotId)
      );
      validateSteps(locked);

      const insertedFlows = await tx
        .insert(productFlows)
        .values({
          id: flow.id,
          productId: flow.productId,
          title: flow.title,
          description: flow.description,
          platform: flow.platform,
          flowType: flow.flowType,
        })
        .returning();

      const insertedFlow = insertedFlows[0];
      if (!insertedFlow) {
        throw productFlowNotFound();
      }

      await tx.insert(productFlowSteps).values(
        flow.steps.map((step, index) => ({
          flowId: insertedFlow.id,
          screenshotId: step.screenshotId,
          position: index,
          caption: step.caption,
        }))
      );

      return toDomain(insertedFlow, await this.findSteps(tx, insertedFlow.id));
    });
  }

  async updateById(
    id: string,
    modifier: (flow: ProductFlow) => ProductFlow,
    validateSteps: (lockedScreenshots: ProductScreenshot[], lockedFlow: ProductFlow) => void
  ): Promise<ProductFlow> {
    return this.db.transaction(async tx => {
      const lockedFlowRows = await tx.select().from(productFlows).where(eq(productFlows.id, id)).for('update').limit(1);
      const current = lockedFlowRows[0];
      if (!current) {
        throw productFlowNotFound();
      }

      const currentSteps = await this.findSteps(tx, id);
      const next = modifier(toDomain(current, currentSteps));

      const locked = await this.lockStepScreenshots(
        tx,
        next.steps.map(step => step.screenshotId)
      );
      validateSteps(locked, toDomain(current, currentSteps));

      await tx.delete(productFlowSteps).where(eq(productFlowSteps.flowId, id));
      await tx.insert(productFlowSteps).values(
        next.steps.map((step, index) => ({
          flowId: id,
          screenshotId: step.screenshotId,
          position: index,
          caption: step.caption,
        }))
      );

      const updatedFlows = await tx
        .update(productFlows)
        .set({
          title: next.title,
          description: next.description,
          platform: next.platform,
          flowType: next.flowType,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(productFlows.id, id))
        .returning();

      const updated = updatedFlows[0];
      if (!updated) {
        throw productFlowNotFound();
      }
      return toDomain(updated, await this.findSteps(tx, id));
    });
  }

  async deleteById(id: string): Promise<void> {
    await this.db.delete(productFlows).where(eq(productFlows.id, id));
  }

  private async findSteps(tx: Tx, flowId: string): Promise<StepRow[]> {
    return tx
      .select()
      .from(productFlowSteps)
      .where(eq(productFlowSteps.flowId, flowId))
      .orderBy(asc(productFlowSteps.position));
  }

  async findById(id: string): Promise<ProductFlow | null> {
    return this.db.transaction(async tx => {
      const flowRows = await tx.select().from(productFlows).where(eq(productFlows.id, id)).limit(1);
      const flow = flowRows[0];
      if (!flow) {
        return null;
      }
      return toDomain(flow, await this.findSteps(tx, id));
    });
  }

  async findManyByProductId(productId: string): Promise<ProductFlow[]> {
    return this.db.transaction(async tx => {
      const flows = await tx
        .select()
        .from(productFlows)
        .where(eq(productFlows.productId, productId))
        .orderBy(asc(productFlows.id));
      const steps = await tx
        .select()
        .from(productFlowSteps)
        .where(inArray(productFlowSteps.flowId, flows.length > 0 ? flows.map(flow => flow.id) : ['']));
      return flows.map(flow =>
        toDomain(
          flow,
          steps.filter(step => step.flowId === flow.id)
        )
      );
    });
  }

  async findFlowIdsByScreenshotId(screenshotId: string): Promise<string[]> {
    const rows = await this.db
      .select({ flowId: productFlowSteps.flowId })
      .from(productFlowSteps)
      .where(eq(productFlowSteps.screenshotId, screenshotId));
    return rows.map(row => row.flowId);
  }

  async findManyVisualPublishedByFilterAndAfterIdAndLimit(
    filter: VisualFlowFilter,
    limit: number,
    afterId?: string
  ): Promise<VisualFlowSummary[]> {
    const conditions = [buildVisualFlowFilterConditions(filter)];
    if (afterId) {
      conditions.push(lt(productFlows.id, afterId));
    }

    const rows = await this.db
      .select({
        id: productFlows.id,
        title: productFlows.title,
        description: productFlows.description,
        platform: productFlows.platform,
        flowType: productFlows.flowType,
        stepCount: stepCountExpr,
        coverId: sql<string | null>`${coverColumn('id')}`,
        coverImageUrl: sql<string | null>`${coverColumn('image_url')}`,
        coverImageAlt: sql<string | null>`${coverColumn('image_alt')}`,
        productId: productFlows.productId,
        productName: products.name,
        productSlug: products.slug,
      })
      .from(productFlows)
      .innerJoin(products, eq(products.id, productFlows.productId))
      .where(and(...conditions))
      .orderBy(sql`${productFlows.id} DESC`)
      .limit(limit);

    return rows.flatMap(row => {
      const summary = toVisualSummary(row);
      return summary ? [summary] : [];
    });
  }

  async findVisualPublishedById(id: string): Promise<VisualFlowDetail | null> {
    return this.findFlowDetail(id, { publishedOnly: true });
  }

  async findAdminFlowDetailById(id: string): Promise<VisualFlowDetail | null> {
    return this.findFlowDetail(id, { publishedOnly: false });
  }

  private async findFlowDetail(
    id: string,
    { publishedOnly }: { publishedOnly: boolean }
  ): Promise<VisualFlowDetail | null> {
    const flowRows = await this.db
      .select({
        id: productFlows.id,
        productId: productFlows.productId,
        title: productFlows.title,
        description: productFlows.description,
        platform: productFlows.platform,
        flowType: productFlows.flowType,
        productName: products.name,
        productSlug: products.slug,
      })
      .from(productFlows)
      .innerJoin(products, eq(products.id, productFlows.productId))
      .where(publishedOnly ? and(isNotNull(products.publishedAt), eq(productFlows.id, id)) : eq(productFlows.id, id))
      .limit(1);

    const flow = flowRows[0];
    if (!flow) {
      return null;
    }

    const steps = await this.db
      .select({
        position: productFlowSteps.position,
        caption: productFlowSteps.caption,
        screenshotId: productScreenshots.id,
        imageUrl: productScreenshots.imageUrl,
        imageAlt: productScreenshots.imageAlt,
        screenshotTitle: productScreenshots.title,
      })
      .from(productFlowSteps)
      .innerJoin(productScreenshots, eq(productScreenshots.id, productFlowSteps.screenshotId))
      .where(eq(productFlowSteps.flowId, id))
      .orderBy(asc(productFlowSteps.position));

    return {
      id: flow.id,
      productId: flow.productId,
      title: flow.title,
      description: flow.description,
      platform: flow.platform,
      flowType: flow.flowType,
      productName: flow.productName,
      productSlug: flow.productSlug,
      steps: steps.map(step => ({
        position: step.position,
        caption: step.caption,
        screenshot: {
          id: step.screenshotId,
          imageUrl: step.imageUrl,
          imageAlt: step.imageAlt,
          title: step.screenshotTitle,
        },
      })),
    };
  }

  async countVisualPublishedByFilter(filter: VisualFlowFilter): Promise<number> {
    const rows = await this.db
      .select({ value: count() })
      .from(productFlows)
      .innerJoin(products, eq(products.id, productFlows.productId))
      .where(buildVisualFlowFilterConditions(filter));

    return rows[0]?.value ?? 0;
  }

  async findManyVisualPublishedByScreenshotId(screenshotId: string): Promise<VisualFlowSummary[]> {
    const rows = await this.db
      .select({
        id: productFlows.id,
        title: productFlows.title,
        description: productFlows.description,
        platform: productFlows.platform,
        flowType: productFlows.flowType,
        stepCount: stepCountExpr,
        coverId: sql<string | null>`${coverColumn('id')}`,
        coverImageUrl: sql<string | null>`${coverColumn('image_url')}`,
        coverImageAlt: sql<string | null>`${coverColumn('image_alt')}`,
        productId: productFlows.productId,
        productName: products.name,
        productSlug: products.slug,
      })
      .from(productFlowSteps)
      .innerJoin(productFlows, eq(productFlows.id, productFlowSteps.flowId))
      .innerJoin(products, eq(products.id, productFlows.productId))
      .where(and(isNotNull(products.publishedAt), eq(productFlowSteps.screenshotId, screenshotId)))
      .orderBy(sql`${productFlows.id} DESC`);

    return rows.flatMap(row => {
      const summary = toVisualSummary(row);
      return summary ? [summary] : [];
    });
  }
}
