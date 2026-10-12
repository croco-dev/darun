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
          options?.signal ? { signal: options.signal } : undefined
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

  @Authorized([AuthRole.Admin])
  @Mutation(() => ProductResearchJob)
  async requestProductResearch(@Arg('input') input: RequestProductResearchInput): Promise<ProductResearchJob> {
    const normalized = normalizeOfficialUrl(input.officialUrl);
    if (!normalized.ok) {
      throw new Error(normalized.reason);
    }
    const deps = await this.buildDeps();
    // Manual re-research (new/absent requestId) creates a new logical job;
    // same request-id retransmit returns the single existing job.
    const { job, queued } = await this.researchService.requestResearch(
      normalized.url,
      deps,
      input.requestId ?? crypto.randomUUID()
    );
    if (queued) {
      // 큐 전송 실패는 pending으로 남겨 recovery tick이 재발견한다.
      // setImmediate 폴백을 제거하고, 전송 성공 여부만 정직하게 보고한다.
      await this.queueService.sendJob({ jobId: job.id }).catch(error => {
        console.warn('[ProductResearchMutationResolver] Failed to send job to SQS; leaving pending:', error);
      });
    }
    return toProductResearchJobGraph(job);
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => ProductResearchJob, { nullable: true })
  async retryProductResearch(
    @Arg('jobId') jobId: string,
    @Arg('input', { nullable: true }) input?: RetryProductResearchInput
  ): Promise<ProductResearchJob | null> {
    const current = await this.jobRepository.findById(jobId);
    if (!current) {
      throw new Error(`존재하지 않는 조사 작업입니다: ${jobId}`);
    }
    if (current.status !== 'failed') {
      return toProductResearchJobGraph(current);
    }
    const deps = await this.buildDeps();
    // 실패 작업 재시도는 새 논리 job을 만들어 이전 결과를 보존한다.
    // 같은 requestId 재전송은 단일 기존 job을 반환한다(deduped).
    const { job, deduped } = await this.researchService.retryFailedResearch(jobId, deps, input?.requestId);
    void deduped;
    // 동일 ID 재대기 경로: 같은 requestId 재시도가 기존 failed job 자체를
    // 반환했을 때만 CAS로 pending 전이를 시도한다. 새 논리 job이 생긴
    // 경우(job.id !== current.id)는 새 job을 큐로 보내고 끝난다.
    // 레거시 단위 테스트의 same-id mock도 이 분기로 처리한다.
    if (typeof this.jobRepository.requeueFailedJob === 'function' && job.id === current.id) {
      const requeued = await this.jobRepository.requeueFailedJob({ jobId, expectedStatuses: ['failed'] });
      const latest = requeued ?? (await this.jobRepository.findById(jobId)) ?? current;
      if (latest.status !== 'pending') {
        return toProductResearchJobGraph(latest);
      }
      try {
        await this.queueService.sendJob({ jobId: latest.id });
      } catch (error) {
        console.warn('[ProductResearchMutationResolver] Failed to retry job via SQS; leaving pending:', error);
      }
      return toProductResearchJobGraph(latest);
    }
    try {
      await this.queueService.sendJob({ jobId: job.id });
    } catch (error) {
      console.warn('[ProductResearchMutationResolver] Failed to retry job via SQS; leaving pending:', error);
    }
    return toProductResearchJobGraph(job);
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
