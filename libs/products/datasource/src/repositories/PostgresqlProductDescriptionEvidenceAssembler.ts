import {
  ProductDescriptionEvidenceAssemblerToken,
  projectProductDescriptionEvidence,
  productDescriptionEvidenceReadFailed,
  type IProductDescriptionEvidenceAssembler,
  type ProductDescriptionEvidenceSources,
  type ProductResearchDraftV1,
} from '@darun/products-domain';
import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { asc, eq, inArray } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { categories } from '../entities/CategorySchema';
import { productFeatures } from '../entities/ProductFeaturesSchema';
import { productFlows, productFlowSteps } from '../entities/ProductFlowsSchema';
import { productLinks } from '../entities/ProductLinksSchema';
import { productResearchJobs } from '../entities/ProductResearchJobSchema';
import { products } from '../entities/ProductSchema';
import { productScreenshots } from '../entities/ProductScreenshotsSchema';
import { productTags } from '../entities/ProductTagsSchema';
import { tags } from '../entities/TagSchema';
import { lockProductSource } from './productSourceMutex';

type EvidenceTransaction = Parameters<Parameters<Drizzle['transaction']>[0]>[0];

export interface ProductDescriptionSourceRows {
  product: typeof products.$inferSelect & { description: string };
  categories: Array<typeof categories.$inferSelect | null>;
  features: Array<typeof productFeatures.$inferSelect>;
  tags: string[];
  links: Array<typeof productLinks.$inferSelect>;
  screenshots: Array<typeof productScreenshots.$inferSelect>;
  flows: Array<typeof productFlows.$inferSelect & { steps: Array<{ caption: string }> }>;
  researchSources: ProductDescriptionEvidenceSources['researchSources'];
}

/** Fresh source rows, reusable inside Apply's Product-first transaction; never uses DataLoaders. */
export async function readProductDescriptionEvidenceSources(
  tx: EvidenceTransaction,
  productId: string
): Promise<ProductDescriptionSourceRows> {
  const product = await lockProductSource(tx, productId);
  const categoryRows = product.categoryIds.length
    ? await tx
        .select()
        .from(categories)
        .where(inArray(categories.id, product.categoryIds))
        .orderBy(asc(categories.id))
        .for('share')
    : [];
  const features = await tx.select().from(productFeatures).where(eq(productFeatures.productId, productId));
  const tagRows = await tx
    .select({ name: tags.name })
    .from(productTags)
    .innerJoin(tags, eq(productTags.tagId, tags.id))
    .where(eq(productTags.productId, productId));
  const links = await tx.select().from(productLinks).where(eq(productLinks.productId, productId));
  const screenshots = await tx.select().from(productScreenshots).where(eq(productScreenshots.productId, productId));
  const flows = await tx.select().from(productFlows).where(eq(productFlows.productId, productId));
  const steps = flows.length
    ? await tx
        .select()
        .from(productFlowSteps)
        .where(
          inArray(
            productFlowSteps.flowId,
            flows.map(flow => flow.id)
          )
        )
        .orderBy(asc(productFlowSteps.flowId), asc(productFlowSteps.position))
    : [];
  const [research] = await tx
    .select()
    .from(productResearchJobs)
    .where(eq(productResearchJobs.materializedProductId, productId))
    .limit(1);
  let researchSources: ProductDescriptionEvidenceSources['researchSources'] = [];
  if (research?.status === 'completed' && research.resultJson !== null) {
    const draft = JSON.parse(research.resultJson) as ProductResearchDraftV1;
    if (draft.version !== 1 || !Array.isArray(draft.sources)) {
      throw new Error('Invalid persisted research evidence');
    }
    researchSources = draft.sources;
  }
  const categoryById = new Map(categoryRows.map(category => [category.id, category]));
  const stepsByFlow = new Map<string, Array<{ caption: string }>>();
  for (const step of steps) {
    const group = stepsByFlow.get(step.flowId) ?? [];
    group.push({ caption: step.caption });
    stepsByFlow.set(step.flowId, group);
  }
  return {
    product: { ...product, description: product.description ?? '' },
    categories: product.categoryIds.map(id => categoryById.get(id) ?? null),
    features,
    tags: tagRows.map(tag => tag.name),
    links,
    screenshots,
    flows: flows.map(flow => ({
      ...flow,
      steps: stepsByFlow.get(flow.id) ?? [],
    })),
    researchSources,
  } satisfies ProductDescriptionEvidenceSources;
}

@Service(ProductDescriptionEvidenceAssemblerToken)
export class PostgresqlProductDescriptionEvidenceAssembler implements IProductDescriptionEvidenceAssembler {
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

  async assemble(productId: string) {
    try {
      return await this.db.transaction(async tx =>
        projectProductDescriptionEvidence(await readProductDescriptionEvidenceSources(tx, productId))
      );
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'product/not-found') {
        throw error;
      }
      throw productDescriptionEvidenceReadFailed('snapshot', error);
    }
  }
}
