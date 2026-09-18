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
import { ProductDescriptionQueueService } from './ProductDescriptionQueueService';

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
  }> {
    const query = typeof identifier === 'string' ? { id: identifier } : identifier;
    const product = await this.getProductUseCase.execute(query);
    if (!product) {
      throw productNotFound();
    }

    if (!this.productDescriptionJobRepository) {
      const updatedProduct = await this.generateProductDescriptionUseCase.execute({
        productId: product.id,
      });
      return {
        product: updatedProduct,
        job: {
          id: product.id,
          productId: product.id,
          status: 'completed',
          message: 'AI 소개 생성이 완료되었습니다.',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
    }

    const job = await this.productDescriptionJobRepository.createJob({
      productId: product.id,
      status: 'pending',
      message: '소개 생성 작업이 대기열에 등록되었습니다.',
    });

    let isQueued = false;
    if (this.productDescriptionQueueService) {
      try {
        isQueued = await this.productDescriptionQueueService.sendJob({
          jobId: job.id,
          productId: product.id,
        });
      } catch (err) {
        console.warn(
          '[ProductDescriptionJobService] Failed to send job to SQS, falling back to background process:',
          err
        );
      }
    }

    if (!isQueued) {
      setImmediate(() => {
        void this.executeJob(job.id, product.id);
      });
    }

    return {
      product,
      job,
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

  async retryProductDescriptionJob(jobId: string): Promise<ProductDescriptionJobEntity> {
    if (!this.productDescriptionJobRepository) {
      throw new Error('ProductDescriptionJobRepository가 설정되지 않았습니다.');
    }

    const job = await this.productDescriptionJobRepository.findJobById(jobId);
    if (!job) {
      throw new Error(`존재하지 않는 AI 소개 생성 작업입니다: ${jobId}`);
    }

    const updatedJob = await this.productDescriptionJobRepository.updateJobStatus(jobId, 'pending', {
      message: 'AI 소개 생성 작업이 재시도 대기열에 등록되었습니다.',
      error: null,
    });

    let isQueued = false;
    if (this.productDescriptionQueueService) {
      try {
        isQueued = await this.productDescriptionQueueService.sendJob({
          jobId: job.id,
          productId: job.productId,
        });
      } catch (err) {
        console.warn(
          '[ProductDescriptionJobService] Failed to send retry job to SQS, falling back to background process:',
          err
        );
      }
    }

    if (!isQueued) {
      setImmediate(() => {
        void this.executeJob(job.id, job.productId);
      });
    }

    return updatedJob;
  }

  async executeJob(jobId: string, productId: string): Promise<void> {
    if (!this.productDescriptionJobRepository) {
      await this.generateProductDescriptionUseCase.execute({ productId });
      return;
    }

    try {
      await this.productDescriptionJobRepository.updateJobStatus(jobId, 'in_progress', {
        message: 'LLM으로 AI 소개를 생성하고 있습니다...',
      });

      await this.generateProductDescriptionUseCase.execute({ productId });

      await this.productDescriptionJobRepository.updateJobStatus(jobId, 'completed', {
        message: 'AI 소개 생성이 완료되었습니다.',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error(`[ProductDescriptionJobService] Product description job ${jobId} failed:`, error);
      await this.productDescriptionJobRepository.updateJobStatus(jobId, 'failed', {
        error: errorMessage,
        message: 'AI 소개 생성에 실패했습니다.',
      });
    }
  }
}
