import {
  GenerateProductDescription,
  GetProduct,
  type Product,
  type ProductDescriptionJobEntity,
  type ProductDescriptionJobRepository,
  ProductDescriptionJobRepositoryToken,
  type ProductDescriptionJobStatus,
  productNotFound,
} from '@darun/products-domain';
import {
  JOB_LEASE_MS,
  JOB_COMMIT_MARGIN_MS,
  isAbortError,
  isRetryableError,
  withAbortableStage,
} from '@darun/utils-llm';
import { Inject, Service } from 'typedi';
import { randomUUID } from 'node:crypto';
import { ProductDescriptionQueueService } from './ProductDescriptionQueueService';

export const PRODUCT_DESCRIPTION_LEASE_MS = JOB_LEASE_MS;
export const PRODUCT_DESCRIPTION_STAGE_BUDGET_MS = 270_000 - JOB_COMMIT_MARGIN_MS;

@Service()
export class ProductDescriptionJobService {
  constructor(
    private readonly getProductUseCase: GetProduct,
    private readonly generateProductDescriptionUseCase: GenerateProductDescription,
    @Inject(ProductDescriptionJobRepositoryToken)
    private readonly productDescriptionJobRepository: ProductDescriptionJobRepository,
    private readonly productDescriptionQueueService: ProductDescriptionQueueService
  ) {}

  async requestProductDescriptionJob(identifier: { id?: string; slug?: string } | string): Promise<{
    product: Product;
    job: ProductDescriptionJobEntity;
    queued: boolean;
  }> {
    const query = typeof identifier === 'string' ? { id: identifier } : identifier;
    const product = await this.getProductUseCase.execute(query);
    if (!product) {
      throw productNotFound();
    }

    const job = await this.productDescriptionJobRepository.createJob({
      productId: product.id,
      status: 'pending',
      message: '소개 생성 작업이 대기열에 등록되었습니다.',
    });

    // 큐 전송 실패는 pending으로 남겨 recovery tick이 재발견한다.
    // setImmediate 폴백을 제거하고, 전송 성공 여부만 정직하게 보고한다.
    const queued = await this.sendToQueue({ jobId: job.id, productId: product.id });

    return {
      product,
      job,
      queued,
    };
  }

  async getJob(id: string): Promise<ProductDescriptionJobEntity | null> {
    return this.productDescriptionJobRepository.findJobById(id);
  }

  async getJobs(options?: {
    status?: ProductDescriptionJobStatus;
    limit?: number;
    offset?: number;
  }): Promise<ProductDescriptionJobEntity[]> {
    return this.productDescriptionJobRepository.findJobs(options);
  }

  async retryProductDescriptionJob(jobId: string): Promise<ProductDescriptionJobEntity & { queued: boolean }> {
    const job = await this.productDescriptionJobRepository.findJobById(jobId);
    if (!job) throw new Error(`존재하지 않는 AI 소개 생성 작업입니다: ${jobId}`);
    if (job.status !== 'failed' && job.status !== 'pending')
      throw new Error(`재시도할 수 없는 AI 소개 생성 작업 상태입니다: ${job.status}`);
    const retry =
      job.status === 'failed'
        ? await this.productDescriptionJobRepository.createJob({ productId: job.productId, retryOfJobId: job.id })
        : job;
    const queued = await this.sendToQueue({ jobId: retry.id, productId: retry.productId });
    return { ...retry, queued };
  }

  async executeJob(
    jobId: string,
    productId: string,
    options?: { leaseToken?: string; signal?: AbortSignal; stageBudgetMs?: number; deadline?: Date }
  ): Promise<void> {
    const repository = this.productDescriptionJobRepository;
    const job = await repository.findJobById(jobId);
    if (!job || job.productId !== productId) throw new Error('Description queue identity mismatch');
    const leaseToken = options?.leaseToken ?? randomUUID();
    const claim = await repository.claimJobLease({
      jobId,
      leaseToken,
      leaseUntil: new Date(Date.now() + JOB_LEASE_MS),
    });
    if (!claim) return;
    let stageSignal: AbortSignal | undefined;

    try {
      const candidateResult = await withAbortableStage(
        async signal => {
          stageSignal = signal;
          const result = await this.generateProductDescriptionUseCase.execute({ productId: claim.productId, signal });
          signal.throwIfAborted();
          return result;
        },
        {
          budgetMs: options?.stageBudgetMs ?? PRODUCT_DESCRIPTION_STAGE_BUDGET_MS,
          signal: options?.signal,
          message: '소개 생성 작업 실행 시간이 초과되었습니다.',
        }
      );
      await repository.completeJobLease(jobId, leaseToken, 'completed', {
        message: 'AI 소개 생성이 완료되었습니다.',
        commitBefore: options?.deadline ? new Date(options.deadline.getTime() - JOB_COMMIT_MARGIN_MS) : undefined,
        candidateHtml: candidateResult.candidateHtml,
        candidateDocument: JSON.stringify(candidateResult.candidateDocument),
        evidenceHash: candidateResult.evidenceHash,
        evidenceHashVersion: candidateResult.evidenceHashVersion,
        baseDescriptionHash: candidateResult.baseDescriptionHash,
        writerModel: candidateResult.writerModel,
        reviewerModel: candidateResult.reviewerModel,
        writerPromptVersion: candidateResult.writerPromptVersion,
        reviewerPromptVersion: candidateResult.reviewerPromptVersion,
        rendererVersion: candidateResult.rendererVersion,
      });
    } catch (error) {
      if (stageSignal?.aborted || isAbortError(error) || options?.signal?.aborted) return;
      const message = error instanceof Error ? error.message : '알 수 없는 오류';
      if (isRetryableError(error)) {
        await repository.retryJobLease(jobId, leaseToken, message);
      } else {
        const status = message.includes('stale') ? 'superseded' : 'failed';
        await repository.completeJobLease(jobId, leaseToken, status, {
          error: message,
          message: 'AI 소개 생성에 실패했습니다.',
        });
      }
    }
  }

  /**
   * 주기 recovery tick: 전송 누락 pending과 만료 lease in_progress를
   * 재발견해 큐로 다시 전송한다. 전송 실패는 pending으로 남긴다.
   */
  async recoverInterruptedJobs(input?: { now?: Date; limit?: number }): Promise<{ recovered: number; queued: number }> {
    const jobs = await this.productDescriptionJobRepository.findRecoverableJobs({
      now: input?.now ?? new Date(),
      limit: input?.limit ?? 25,
    });
    let queued = 0;
    for (const job of jobs) {
      const sent = await this.sendToQueue({ jobId: job.id, productId: job.productId });
      if (sent) {
        queued += 1;
      }
    }
    return { recovered: jobs.length, queued };
  }

  private async sendToQueue(payload: { jobId: string; productId: string }): Promise<boolean> {
    try {
      return await this.productDescriptionQueueService.sendJob(payload);
    } catch (err) {
      console.warn('[ProductDescriptionJobService] Failed to send job to SQS; leaving pending for recovery:', err);
      return false;
    }
  }
}
