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
import { Inject, Service } from 'typedi';
import { randomUUID } from 'node:crypto';
import { ProductDescriptionQueueService } from './ProductDescriptionQueueService';

export const PRODUCT_DESCRIPTION_LEASE_MS = 5 * 60 * 1000;
export const PRODUCT_DESCRIPTION_STAGE_BUDGET_MS = 90_000;

function isAbortError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === 'AbortError' || error.message.includes('중단');
  }
  return false;
}

function withWorkerDeadline<T>(
  run: (signal: AbortSignal) => Promise<T>,
  deadlineMs: number,
  parentSignal?: AbortSignal
): Promise<T> {
  const controller = new AbortController();
  if (parentSignal?.aborted) {
    controller.abort();
  }
  const onParentAbort = () => controller.abort();
  if (parentSignal) {
    parentSignal.addEventListener('abort', onParentAbort, { once: true });
  }
  const timeout = setTimeout(() => controller.abort(), deadlineMs);
  const attempt: Promise<T> = run(controller.signal);
  // 늦게 settle되는 promise의 unhandled rejection을 방지한다.
  attempt.catch(() => {});
  const cleanup = () => {
    clearTimeout(timeout);
    parentSignal?.removeEventListener('abort', onParentAbort);
  };
  return Promise.race([
    attempt.finally(cleanup),
    new Promise<never>((_, reject) => {
      controller.signal.addEventListener(
        'abort',
        () => {
          cleanup();
          const aborted = new Error('작업이 중단되었습니다.');
          aborted.name = 'AbortError';
          reject(aborted);
        },
        { once: true }
      );
    }),
  ]);
}

@Service()
export class ProductDescriptionJobService {
  constructor(
    private readonly getProductUseCase: GetProduct,
    private readonly generateProductDescriptionUseCase: GenerateProductDescription,
    @Inject(ProductDescriptionJobRepositoryToken)
    private readonly productDescriptionJobRepository?: ProductDescriptionJobRepository,
    private readonly productDescriptionQueueService?: ProductDescriptionQueueService
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

    if (!this.productDescriptionJobRepository) {
      const candidateResult = await this.generateProductDescriptionUseCase.execute({
        productId: product.id,
      });
      return {
        product,
        job: {
          id: product.id,
          productId: product.id,
          status: 'completed',
          message: 'AI 소개 생성이 완료되었습니다.',
          candidateHtml: candidateResult.candidateHtml,
          candidateDocument: JSON.stringify(candidateResult.candidateDocument),
          evidenceHash: candidateResult.evidenceHash,
          baseDescriptionHash: candidateResult.baseDescriptionHash,
          writerModel: candidateResult.writerModel,
          reviewerModel: candidateResult.reviewerModel,
          writerPromptVersion: candidateResult.writerPromptVersion,
          reviewerPromptVersion: candidateResult.reviewerPromptVersion,
          rendererVersion: candidateResult.rendererVersion,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        queued: false,
      };
    }

    const job = await this.productDescriptionJobRepository.createJob({
      productId: product.id,
      status: 'pending',
      message: '소개 생성 작업이 대기열에 등록되었습니다.',
    });

    // 큐 전송 실패는 pending으로 남겨 recovery tick이 재발견한다.
    // setImmediate 폴백을 제거하고, 전송 성공 여부만 정직하게 보고한다.
    const queued = await this.sendToQueue({
      jobId: job.id,
      productId: product.id,
    });

    return {
      product,
      job,
      queued,
    };
  }

  async getJob(id: string): Promise<ProductDescriptionJobEntity | null> {
    if (!this.productDescriptionJobRepository) {
      return null;
    }
    return this.productDescriptionJobRepository.findJobById(id);
  }

  async getJobs(options?: {
    status?: ProductDescriptionJobStatus;
    limit?: number;
    offset?: number;
  }): Promise<ProductDescriptionJobEntity[]> {
    if (!this.productDescriptionJobRepository) {
      return [];
    }
    return this.productDescriptionJobRepository.findJobs(options);
  }

  async retryProductDescriptionJob(jobId: string): Promise<ProductDescriptionJobEntity & { queued: boolean }> {
    if (!this.productDescriptionJobRepository) {
      throw new Error('ProductDescriptionJobRepository가 설정되지 않았습니다.');
    }

    const job = await this.productDescriptionJobRepository.findJobById(jobId);
    if (!job) {
      throw new Error(`존재하지 않는 AI 소개 생성 작업입니다: ${jobId}`);
    }
    // 재시도는 failed 한정: in_progress lease 소유권을 건드리지 않고
    // 조건부 상태 전이로만 pending에 복귀한다. 레거시 repository가
    // claimJobStatus 없이 updateJobStatus만 가진 경우에도 동작한다.
    // 소유권을 잃은 pending 재진입(재전송 경쟁)은 업데이트 없이 큐로만 보낸다.
    if (job.status === 'failed') {
      const updatedJob =
        typeof this.productDescriptionJobRepository.claimJobStatus === 'function'
          ? await this.productDescriptionJobRepository.claimJobStatus(jobId, ['failed'], 'pending', {
              message: 'AI 소개 생성 작업이 재시도 대기열에 등록되었습니다.',
              error: null,
              appliedAt: null,
            })
          : await this.productDescriptionJobRepository.updateJobStatus(jobId, 'pending', {
              message: 'AI 소개 생성 작업이 재시도 대기열에 등록되었습니다.',
              error: null,
              appliedAt: null,
            });
      if (!updatedJob) {
        throw new Error(`재시도 조건이 만료된 AI 소개 생성 작업입니다: ${jobId}`);
      }

      const queuedAfterRetry = await this.sendToQueue({
        jobId: job.id,
        productId: job.productId,
      });
      return { ...updatedJob, queued: queuedAfterRetry };
    }
    if (job.status === 'pending') {
      const queued = await this.sendToQueue({
        jobId: job.id,
        productId: job.productId,
      });
      return { ...job, queued };
    }
    throw new Error(`재시도할 수 없는 AI 소개 생성 작업 상태입니다: ${job.status}`);
  }

  async executeJob(
    jobId: string,
    productId: string,
    options?: {
      leaseToken?: string;
      signal?: AbortSignal;
      stageBudgetMs?: number;
    }
  ): Promise<void> {
    if (!this.productDescriptionJobRepository) {
      await this.generateProductDescriptionUseCase.execute({ productId });
      return;
    }

    const repository = this.productDescriptionJobRepository;
    const leaseToken = options?.leaseToken ?? randomUUID();
    const claim =
      typeof repository.claimJobLease === 'function'
        ? await repository.claimJobLease({
            jobId,
            leaseToken,
            leaseUntil: new Date(Date.now() + PRODUCT_DESCRIPTION_LEASE_MS),
          })
        : await repository.claimJobStatus(jobId, ['pending'], 'in_progress', {
            message: 'LLM으로 AI 소개를 생성하고 있습니다...',
          });
    if (!claim) {
      return;
    }
    // lease 선점에 성공한 attempt의 토큰으로만 확정 쓰기를 fence한다.
    const ownedToken = claim.leaseToken ?? leaseToken;

    try {
      type CandidateResult = Awaited<ReturnType<GenerateProductDescription['execute']>>;
      const candidateResult = await withWorkerDeadline<CandidateResult>(
        signal =>
          this.generateProductDescriptionUseCase.execute({
            productId,
            ...(signal ? { signal } : {}),
          } as never) as never,
        options?.stageBudgetMs ?? PRODUCT_DESCRIPTION_STAGE_BUDGET_MS,
        options?.signal
      );

      // lease 소유권과 in_progress 상태를 재확인한 뒤에만 확정한다.
      // 다른 attempt가 소유권을 회수했거나 terminal로 끝난 행은
      // 늦은 completed로 덮어쓰지 않고 결과를 버린다. 단 claim 소유권과
      // 무관한 stale 읽기(leaseToken 불일치 + 같은 ownedToken 아님)는
      // 재확인의 근거로 삼지 않고 DB 조건부 쓰기 fence에 맡긴다.
      if (typeof repository.completeJobLease === 'function') {
        const current = typeof repository.findJobById === 'function' ? await repository.findJobById(jobId) : null;
        if (current && current.leaseToken === ownedToken && current.status !== 'in_progress') {
          console.warn(
            `[ProductDescriptionJobService] Job ${jobId} already terminal (${current.status}); skipping outer completion.`
          );
          return;
        }
      }

      const completed =
        typeof repository.completeJobLease === 'function'
          ? await repository.completeJobLease(jobId, ownedToken, 'completed', {
              message: 'AI 소개 생성이 완료되었습니다.',
              candidateHtml: candidateResult.candidateHtml,
              candidateDocument: JSON.stringify(candidateResult.candidateDocument),
              evidenceHash: candidateResult.evidenceHash,
              baseDescriptionHash: candidateResult.baseDescriptionHash,
              writerModel: candidateResult.writerModel,
              reviewerModel: candidateResult.reviewerModel,
              writerPromptVersion: candidateResult.writerPromptVersion,
              reviewerPromptVersion: candidateResult.reviewerPromptVersion,
              rendererVersion: candidateResult.rendererVersion,
            })
          : await repository.claimJobStatus(jobId, ['in_progress'], 'completed', {
              message: 'AI 소개 생성이 완료되었습니다.',
              candidateHtml: candidateResult.candidateHtml,
              candidateDocument: JSON.stringify(candidateResult.candidateDocument),
              evidenceHash: candidateResult.evidenceHash,
              baseDescriptionHash: candidateResult.baseDescriptionHash,
              writerModel: candidateResult.writerModel,
              reviewerModel: candidateResult.reviewerModel,
              writerPromptVersion: candidateResult.writerPromptVersion,
              reviewerPromptVersion: candidateResult.reviewerPromptVersion,
              rendererVersion: candidateResult.rendererVersion,
            });
      if (!completed) {
        console.warn(`[ProductDescriptionJobService] Late attempt lost lease for job ${jobId}; discarding result.`);
      }
    } catch (error) {
      if (isAbortError(error) || (options?.signal?.aborted ?? false)) {
        // 중단은 lease 만료 후 recovery tick이 재시도하므로 failed로 확정하지 않는다.
        console.warn(`[ProductDescriptionJobService] Job ${jobId} aborted; leaving lease to expire.`);
        return;
      }
      const targetStatus = error instanceof Error && error.message.includes('stale') ? 'superseded' : 'failed';
      const payload =
        targetStatus === 'superseded'
          ? { message: '제품 정보 변경으로 결과가 폐기되었습니다.' as const }
          : {
              error: error instanceof Error ? error.message : '알 수 없는 오류',
              message: 'AI 소개 생성에 실패했습니다.' as const,
            };
      const failed =
        typeof repository.completeJobLease === 'function'
          ? await repository.completeJobLease(jobId, ownedToken, targetStatus, payload)
          : await repository.claimJobStatus(jobId, ['pending', 'in_progress'], targetStatus, payload as never);
      if (!failed) {
        console.warn(`[ProductDescriptionJobService] Late failure for job ${jobId} lost lease; discarding.`);
        return;
      }
      if (targetStatus === 'failed') {
        console.error(`[ProductDescriptionJobService] Product description job ${jobId} failed:`, error);
      }
    }
  }

  /**
   * 주기 recovery tick: 전송 누락 pending과 만료 lease in_progress를
   * 재발견해 큐로 다시 전송한다. 전송 실패는 pending으로 남긴다.
   */
  async recoverInterruptedJobs(input?: { now?: Date; limit?: number }): Promise<{ recovered: number; queued: number }> {
    if (
      !this.productDescriptionJobRepository ||
      typeof this.productDescriptionJobRepository.findRecoverableJobs !== 'function'
    ) {
      return { recovered: 0, queued: 0 };
    }
    const jobs = await this.productDescriptionJobRepository.findRecoverableJobs({
      now: input?.now ?? new Date(),
      limit: input?.limit ?? 50,
    });
    let queued = 0;
    for (const job of jobs) {
      const sent = await this.sendToQueue({
        jobId: job.id,
        productId: job.productId,
      });
      if (sent) {
        queued += 1;
      }
    }
    return { recovered: jobs.length, queued };
  }

  private async sendToQueue(payload: { jobId: string; productId: string }): Promise<boolean> {
    if (!this.productDescriptionQueueService) {
      return false;
    }
    try {
      return await this.productDescriptionQueueService.sendJob(payload);
    } catch (err) {
      console.warn('[ProductDescriptionJobService] Failed to send job to SQS; leaving pending for recovery:', err);
      return false;
    }
  }
}
