import {
  CategoryRepositoryToken,
  ProductResearchJobRepositoryToken,
  ProductResearchMaterializationRepositoryToken,
  normalizeOfficialUrl,
  type CategoryRepository,
  type ProductResearchJobEntity,
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
  RetryProductResearchInput,
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

  private async buildDeps(signal?: AbortSignal): Promise<ProductResearchDependencies> {
    const searchClient = new BraveSearchClient(() => this.llmSettingService.getBraveApiKey());
    const llm = {
      getModel: async () => (await this.llmClient.getConfig()).model,
      complete: async (systemPrompt: string, userPrompt: string, options?: { signal?: AbortSignal }) => {
        const message = await this.llmClient.completion(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          undefined,
          {
            responseFormat: ProductResearchService.researchResponseFormat(),
            ...(options?.signal ? { signal: options.signal } : {}),
          }
        );
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
        search: (query: string, count: number, childSignal?: AbortSignal) =>
          searchClient.search(query, count, childSignal ?? signal),
      },
      llm,
      promptVersion: PRODUCT_RESEARCH_PROMPT_VERSION,
    };
  }

  private async dispatchJob(jobId: string): Promise<void> {
    try {
      await this.queueService.sendJob({ jobId });
    } catch (error) {
      // 큐 전송 실패는 pending으로 남겨 recovery tick이 재발견한다.
      console.warn('[ProductResearchMutationResolver] Failed to send job to SQS:', error);
    }
  }

  private isResendable(job: ProductResearchJobEntity): boolean {
    return job.status === 'pending' || job.status === 'in_progress';
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => ProductResearchJob)
  async requestProductResearch(@Arg('input') input: RequestProductResearchInput): Promise<ProductResearchJob> {
    const normalized = normalizeOfficialUrl(input.officialUrl);
    if (!normalized.ok) {
      throw new Error(normalized.reason);
    }
    const deps = await this.buildDeps();
    // Manual re-research (new requestId) creates a new logical job;
    // same request-id retransmit returns the single existing job (deduped).
    const { job, queued } = await this.researchService.requestResearch(
      { requestId: input.requestId, officialUrl: normalized.url },
      deps
    );
    if (queued || this.isResendable(job)) {
      await this.dispatchJob(job.id);
    }
    return toProductResearchJobGraph(job);
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => ProductResearchJob, { nullable: true })
  async retryProductResearch(
    @Arg('jobId') jobId: string,
    @Arg('input', { nullable: true }) input?: RetryProductResearchInput
  ): Promise<ProductResearchJob | null> {
    const job = await this.jobRepository.findById(jobId);
    if (!job) {
      throw new Error(`존재하지 않는 조사 작업입니다: ${jobId}`);
    }
    if (job.status !== 'failed') {
      if (this.isResendable(job)) {
        await this.dispatchJob(job.id);
      }
      return toProductResearchJobGraph(job);
    }
    const deps = await this.buildDeps();
    // 실패 작업 재시도는 새 논리 job을 만들어 이전 결과를 보존한다.
    // 같은 requestId 재전송은 단일 기존 job을 반환한다(deduped).
    const { job: retried } = await this.researchService.retryFailedResearch(job.id, deps, input?.requestId);
    if (this.isResendable(retried)) {
      await this.dispatchJob(retried.id);
    }
    return toProductResearchJobGraph(retried);
  }

  /**
   * 주기 recovery tick: 전송 누락 pending과 만료 lease in_progress를
   * 재발견해 큐로 다시 전송한다.
   */
  async recoverInterruptedJobs(input?: { now?: Date; limit?: number }): Promise<{ recovered: number; queued: number }> {
    const jobs =
      (await this.jobRepository.findRecoverableJobs?.({
        now: input?.now ?? new Date(),
        limit: input?.limit ?? 50,
      })) ?? [];
    let queued = 0;
    for (const job of jobs) {
      try {
        const sent = await this.queueService.sendJob({ jobId: job.id });
        if (sent) {
          queued += 1;
        }
      } catch (error) {
        console.warn('[ProductResearchMutationResolver] Recovery send failed; leaving pending:', error);
      }
    }
    return { recovered: jobs.length, queued };
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
      officialUrlConfirmed: input.officialUrlConfirmed,
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
