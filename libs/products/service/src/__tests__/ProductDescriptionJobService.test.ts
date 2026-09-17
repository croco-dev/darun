import {
  GenerateProductDescription,
  GetProduct,
  Product,
  type ProductDescriptionJobEntity,
  type ProductDescriptionJobRepository,
} from '@darun/products-domain';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductDescriptionJobService } from '../ProductDescriptionJobService';
import type { ProductDescriptionQueueService } from '../ProductDescriptionQueueService';

describe('ProductDescriptionJobService', () => {
  let getProductUseCase: GetProduct;
  let generateProductDescriptionUseCase: GenerateProductDescription;
  let mockRepository: ProductDescriptionJobRepository;
  let mockQueueService: ProductDescriptionQueueService;

  const mockProduct = new Product({
    id: 'prod-123',
    name: 'Test Product',
    slug: 'test-product',
    summary: 'A test product',
    description: 'Old description',
    logoUrl: 'https://example.com/logo.png',
    categoryIds: [],
    publishedAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    getProductUseCase = {
      execute: vi.fn().mockResolvedValue(mockProduct),
    } as unknown as GetProduct;

    generateProductDescriptionUseCase = {
      execute: vi.fn().mockResolvedValue(mockProduct),
    } as unknown as GenerateProductDescription;

    mockRepository = {
      createJob: vi.fn().mockResolvedValue({
        id: 'job-123',
        productId: 'prod-123',
        status: 'pending',
        message: '소개 생성 작업이 대기열에 등록되었습니다.',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ProductDescriptionJobEntity),
      findJobById: vi.fn().mockResolvedValue({
        id: 'job-123',
        productId: 'prod-123',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ProductDescriptionJobEntity),
      updateJobStatus: vi.fn().mockResolvedValue({
        id: 'job-123',
        productId: 'prod-123',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ProductDescriptionJobEntity),
    };

    mockQueueService = {
      sendJob: vi.fn().mockResolvedValue(true),
    } as unknown as ProductDescriptionQueueService;
  });

  it('throws an error if product is not found', async () => {
    vi.mocked(getProductUseCase.execute).mockResolvedValue(null);
    const service = new ProductDescriptionJobService(getProductUseCase, generateProductDescriptionUseCase);

    await expect(service.requestProductDescriptionJob({ slug: 'non-existent' })).rejects.toThrow();
  });

  it('runs synchronously if productDescriptionJobRepository is not provided', async () => {
    const service = new ProductDescriptionJobService(getProductUseCase, generateProductDescriptionUseCase);

    const result = await service.requestProductDescriptionJob({ slug: 'test-product' });

    expect(generateProductDescriptionUseCase.execute).toHaveBeenCalledWith({ productId: 'prod-123' });
    expect(result.job.status).toBe('completed');
    expect(result.product).toEqual(mockProduct);
  });

  it('creates a job and sends it to SQS when repository and queue service are available', async () => {
    const service = new ProductDescriptionJobService(
      getProductUseCase,
      generateProductDescriptionUseCase,
      mockRepository,
      mockQueueService
    );

    const result = await service.requestProductDescriptionJob({ slug: 'test-product' });

    expect(mockRepository.createJob).toHaveBeenCalledWith({
      productId: 'prod-123',
      status: 'pending',
      message: expect.any(String),
    });
    expect(mockQueueService.sendJob).toHaveBeenCalledWith({
      jobId: 'job-123',
      productId: 'prod-123',
    });
    expect(result.job.id).toBe('job-123');
    expect(result.job.status).toBe('pending');
  });

  it('falls back to setImmediate if SQS send fails or is unconfigured', async () => {
    vi.mocked(mockQueueService.sendJob).mockResolvedValue(false);

    const service = new ProductDescriptionJobService(
      getProductUseCase,
      generateProductDescriptionUseCase,
      mockRepository,
      mockQueueService
    );

    const executeSpy = vi.spyOn(service, 'executeJob').mockResolvedValue();

    const result = await service.requestProductDescriptionJob({ slug: 'test-product' });

    expect(result.job.id).toBe('job-123');
    await new Promise(resolve => setImmediate(resolve));
    expect(executeSpy).toHaveBeenCalledWith('job-123', 'prod-123');
  });

  it('executes job and updates status to completed', async () => {
    const service = new ProductDescriptionJobService(
      getProductUseCase,
      generateProductDescriptionUseCase,
      mockRepository,
      mockQueueService
    );

    await service.executeJob('job-123', 'prod-123');

    expect(mockRepository.updateJobStatus).toHaveBeenCalledWith('job-123', 'in_progress', {
      message: 'LLM으로 AI 소개를 생성하고 있습니다...',
    });
    expect(generateProductDescriptionUseCase.execute).toHaveBeenCalledWith({ productId: 'prod-123' });
    expect(mockRepository.updateJobStatus).toHaveBeenCalledWith('job-123', 'completed', {
      message: 'AI 소개 생성이 완료되었습니다.',
    });
  });

  it('updates status to failed when execution throws error', async () => {
    vi.mocked(generateProductDescriptionUseCase.execute).mockRejectedValue(new Error('LLM Timeout'));

    const service = new ProductDescriptionJobService(
      getProductUseCase,
      generateProductDescriptionUseCase,
      mockRepository,
      mockQueueService
    );

    await service.executeJob('job-123', 'prod-123');

    expect(mockRepository.updateJobStatus).toHaveBeenCalledWith('job-123', 'failed', {
      error: 'LLM Timeout',
      message: 'AI 소개 생성에 실패했습니다.',
    });
  });

  it('retrieves job by id', async () => {
    const service = new ProductDescriptionJobService(
      getProductUseCase,
      generateProductDescriptionUseCase,
      mockRepository,
      mockQueueService
    );

    const job = await service.getJob('job-123');
    expect(mockRepository.findJobById).toHaveBeenCalledWith('job-123');
    expect(job?.id).toBe('job-123');
  });
});
