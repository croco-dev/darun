import {
  CategoryRepositoryToken,
  ProductResearchJobRepositoryToken,
  ProductResearchMaterializationRepositoryToken,
  normalizeOfficialUrl,
  type CategoryRepository,
  type ProductResearchJobRepository,
  type ProductResearchMaterializationRepository,
} from '@darun/products-domain';
import {
  PRODUCT_RESEARCH_PROMPT_VERSION,
  ProductResearchQueueService,
  ProductResearchReviewService,
  ProductResearchService,
  type ProductResearchDependencies,
} from '@darun/products-service';
import { LlmSettingService } from '@darun/translation-service';
import { AuthRole } from '@darun/utils-apollo-server';
import { BraveSearchClient } from '@darun/utils-llm';
import { LlmClient } from '@darun/utils-llm';
import { Arg, Authorized, Mutation, Query, Resolver } from 'type-graphql';
import { Inject, Service } from 'typedi';
import { Product } from './graphs/Product';
import {
  MaterializeResearchedProductInput,
  ProductResearchJob,
  RequestProductResearchInput,
  toProductResearchJobGraph,
} from './graphs/ProductResearch';

@Service()
@Resolver(() => ProductResearchJob)
export class ProductResearchMutationResolver {
  constructor(
    @Inject(ProductResearchJobRepositoryToken)
    private readonly jobRepository: ProductResearchJobRepository,
    @Inject(CategoryRepositoryToken)
    private readonly categoryRepository: CategoryRepository,
    @Inject(ProductResearchMaterializationRepositoryToken)
    private readonly materializationRepository: ProductResearchMaterializationRepository,
    private readonly researchService: ProductResearchService,
    private readonly reviewService: ProductResearchReviewService,
    private readonly queueService: ProductResearchQueueService,
    private readonly llmClient: LlmClient,
    private readonly llmSettingService: LlmSettingService
  ) {}

  private async buildDeps(): Promise<ProductResearchDependencies> {
    const searchClient = new BraveSearchClient(() => this.llmSettingService.getBraveApiKey());
    const llm = {
      getModel: async () => (await this.llmClient.getConfig()).model,
      complete: async (systemPrompt: string, userPrompt: string) => {
        const message = await this.llmClient.completion([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ]);
        const content = typeof message.content === 'string' ? message.content : '';
        if (!content.trim()) {
          throw new Error('LLM 응답이 비어 있습니다.');
        }
        return content;
      },
    };
    return {
      jobRepository: this.jobRepository,
      categoryRepository: this.categoryRepository,
      searchClient: {
        search: (query: string, count: number) => searchClient.search(query, count),
      },
      llm,
      promptVersion: PRODUCT_RESEARCH_PROMPT_VERSION,
    };
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => ProductResearchJob)
  async requestProductResearch(@Arg('input') input: RequestProductResearchInput): Promise<ProductResearchJob> {
    const normalized = normalizeOfficialUrl(input.officialUrl);
    if (!normalized.ok) {
      throw new Error(normalized.reason);
    }
    const deps = await this.buildDeps();
    const { job, queued } = await this.researchService.requestResearch(normalized.url, deps);
    if (queued) {
      let sent = false;
      try {
        sent = await this.queueService.sendJob({ jobId: job.id });
      } catch (error) {
        console.warn('[ProductResearchMutationResolver] Failed to send job to SQS:', error);
      }
      if (!sent) {
        setImmediate(() => {
          void this.researchService.executeResearch(job.id, deps);
        });
      }
    }
    return toProductResearchJobGraph(job);
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => ProductResearchJob, { nullable: true })
  async retryProductResearch(@Arg('jobId') jobId: string): Promise<ProductResearchJob | null> {
    const job = await this.jobRepository.findById(jobId);
    if (!job) {
      throw new Error(`존재하지 않는 조사 작업입니다: ${jobId}`);
    }
    if (job.status !== 'failed') {
      return toProductResearchJobGraph(job);
    }
    const deps = await this.buildDeps();
    try {
      const sent = await this.queueService.sendJob({ jobId: job.id });
      if (!sent) {
        setImmediate(() => {
          void this.researchService.executeResearch(job.id, deps);
        });
      }
    } catch (error) {
      console.warn('[ProductResearchMutationResolver] Failed to retry job via SQS:', error);
      setImmediate(() => {
        void this.researchService.executeResearch(job.id, deps);
      });
    }
    return toProductResearchJobGraph(job);
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => Product)
  async materializeResearchedProduct(@Arg('input') input: MaterializeResearchedProductInput): Promise<Product> {
    const { product } = await this.reviewService.materializeReviewedProduct({
      researchJobId: input.researchJobId,
      name: input.name,
      slug: input.slug,
      summary: input.summary,
      logoUrl: input.logoUrl,
      officialUrl: input.officialUrl,
      categoryIds: input.categoryIds,
      features: input.features.map(feature => ({
        name: feature.name,
        summary: feature.summary,
        emoji: feature.emoji ?? '✨',
      })),
      tags: input.tags,
    });
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      summary: product.summary,
      description: product.description,
      logoUrl: product.logoUrl,
      ownedCompanyId: product.ownedCompanyId,
      updatedAt: product.updatedAt,
      publishedAt: product.publishedAt,
    };
  }
}

@Service()
@Resolver(() => ProductResearchJob)
export class ProductResearchQueryResolver {
  constructor(
    @Inject(ProductResearchJobRepositoryToken)
    private readonly jobRepository: ProductResearchJobRepository
  ) {}

  @Authorized([AuthRole.Admin])
  @Query(() => ProductResearchJob, { nullable: true })
  async productResearchJob(@Arg('id') id: string): Promise<ProductResearchJob | null> {
    const job = await this.jobRepository.findById(id);
    return job ? toProductResearchJobGraph(job) : null;
  }
}
